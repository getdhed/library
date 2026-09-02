import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { createFrontendServer } from "./server.mjs";

let distDirectory;
let frontend;
let frontendOrigin;
let backend;
let backendOrigin;
let lastBackendRequest;
let resolveFirstBackendChunk;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function beginRequest(origin, requestPath, options = {}) {
  let req;
  const response = new Promise((resolve, reject) => {
    req = http.request(`${origin}${requestPath}`, options, (res) => {
      const responseChunks = [];
      res.on("data", (chunk) => responseChunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(responseChunks),
        });
      });
    });
    req.on("error", reject);
  });
  return { req, response };
}

function request(origin, requestPath, options = {}, chunks = []) {
  const ongoing = beginRequest(origin, requestPath, options);
  for (const chunk of chunks) ongoing.req.write(chunk);
  ongoing.req.end();
  return ongoing.response;
}

before(async () => {
  distDirectory = await mkdtemp(path.join(os.tmpdir(), "library-frontend-"));
  await mkdir(path.join(distDirectory, "assets"));
  await writeFile(path.join(distDirectory, "index.html"), "<!doctype html><main>Library SPA</main>");
  await writeFile(path.join(distDirectory, "assets", "app-deadbeef.js"), "globalThis.loaded = true;\n");

  backend = http.createServer(async (req, res) => {
    const body = [];
    for await (const chunk of req) {
      body.push(chunk);
      resolveFirstBackendChunk?.();
      resolveFirstBackendChunk = undefined;
    }
    lastBackendRequest = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(body),
    };

    res.writeHead(201, {
      "Content-Type": "application/octet-stream",
      Connection: "close, x-backend-secret",
      "X-Backend-Secret": "must-be-removed",
      "X-Kept": "yes",
      "Set-Cookie": ["first=1; HttpOnly", "second=2; HttpOnly"],
    });
    res.write("download-");
    setTimeout(() => res.end("stream"), 5);
  });
  backendOrigin = await listen(backend);

  frontend = createFrontendServer({
    distDir: distDirectory,
    backendTarget: backendOrigin,
    logger: { error() {} },
  });
  frontendOrigin = await listen(frontend);
});

after(async () => {
  await Promise.all([close(frontend), close(backend)]);
  await rm(distDirectory, { recursive: true, force: true });
});

test("serves the SPA and immutable build assets with security headers", async () => {
  const page = await request(frontendOrigin, "/client/route?query=kept");
  assert.equal(page.status, 200);
  assert.match(page.body.toString(), /Library SPA/);
  assert.equal(page.headers["cache-control"], "no-cache");
  assert.equal(page.headers["x-content-type-options"], "nosniff");
  assert.equal(page.headers["x-frame-options"], "SAMEORIGIN");
  assert.match(page.headers["content-security-policy"], /default-src 'self'/);
  assert.match(page.headers["content-security-policy"], /frame-ancestors 'self'/);
  assert.match(page.headers["content-security-policy"], /connect-src 'self' blob:/);
  assert.match(page.headers["content-security-policy"], /https:\/\/fonts\.googleapis\.com/);

  const asset = await request(frontendOrigin, "/assets/app-deadbeef.js", { method: "HEAD" });
  assert.equal(asset.status, 200);
  assert.equal(asset.body.length, 0);
  assert.equal(asset.headers["content-type"], "text/javascript; charset=utf-8");
  assert.equal(asset.headers["cache-control"], "public, max-age=31536000, immutable");
  assert.equal(Number(asset.headers["content-length"]), Buffer.byteLength("globalThis.loaded = true;\n"));
});

test("rejects unsafe static paths, missing assets, and unsupported methods", async () => {
  const traversal = await request(frontendOrigin, "/..%2f..%2foutside.txt");
  assert.equal(traversal.status, 400);
  assert.doesNotMatch(traversal.body.toString(), /Library SPA/);

  const malformed = await request(frontendOrigin, "/%ZZ");
  assert.equal(malformed.status, 400);

  const missingAsset = await request(frontendOrigin, "/assets/missing.js");
  assert.equal(missingAsset.status, 404);

  const dottedRoute = await request(frontendOrigin, "/authors/a.b", {
    headers: { Accept: "text/html" },
  });
  assert.equal(dottedRoute.status, 200);
  assert.match(dottedRoute.body.toString(), /Library SPA/);

  const unsupported = await request(frontendOrigin, "/client/route", { method: "POST" });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.allow, "GET, HEAD");
});

test("streams API requests and responses while preserving query and end-to-end headers", async () => {
  const upload = [Buffer.alloc(64 * 1024, "a"), Buffer.from("tail")];
  const firstChunkReachedBackend = new Promise((resolve) => {
    resolveFirstBackendChunk = resolve;
  });
  const ongoing = beginRequest(
    frontendOrigin,
    "/api/documents/file?name=a%2Bb&download=1",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        Connection: "keep-alive, x-client-secret",
        "Content-Type": "application/octet-stream",
        "X-Client-Secret": "must-be-removed",
        "X-Forwarded-For": "203.0.113.10",
        "X-Forwarded-Host": "library.example.org",
        "X-Forwarded-Proto": "https",
      },
    },
  );
  ongoing.req.write(upload[0]);
  await Promise.race([
    firstChunkReachedBackend,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error("upload was buffered by the frontend")), 2_000);
      timer.unref();
    }),
  ]);
  ongoing.req.end(upload[1]);
  const response = await ongoing.response;

  assert.equal(response.status, 201);
  assert.equal(response.body.toString(), "download-stream");
  assert.equal(response.headers["x-kept"], "yes");
  assert.equal(response.headers["x-backend-secret"], undefined);
  assert.deepEqual(response.headers["set-cookie"], ["first=1; HttpOnly", "second=2; HttpOnly"]);

  assert.equal(lastBackendRequest.method, "POST");
  assert.equal(lastBackendRequest.url, "/api/documents/file?name=a%2Bb&download=1");
  assert.equal(lastBackendRequest.headers.authorization, "Bearer test-token");
  assert.equal(lastBackendRequest.headers["x-client-secret"], undefined);
  assert.match(lastBackendRequest.headers["x-forwarded-for"], /^203\.0\.113\.10, /);
  assert.equal(lastBackendRequest.headers["x-forwarded-host"], "library.example.org");
  assert.equal(lastBackendRequest.headers["x-forwarded-proto"], "https");
  assert.deepEqual(lastBackendRequest.body, Buffer.concat(upload));
});

test("returns a controlled 502 when the backend cannot be reached", async () => {
  const unavailable = http.createServer();
  const unavailableOrigin = await listen(unavailable);
  await close(unavailable);

  const isolatedFrontend = createFrontendServer({
    distDir: distDirectory,
    backendTarget: unavailableOrigin,
    logger: { error() {} },
  });
  const isolatedOrigin = await listen(isolatedFrontend);
  try {
    const response = await request(isolatedOrigin, "/api/health");
    assert.equal(response.status, 502);
    assert.equal(response.body.toString(), "Bad Gateway\n");
  } finally {
    await close(isolatedFrontend);
  }
});

test("rejects ambiguous backend proxy targets at startup", () => {
  assert.throws(
    () =>
      createFrontendServer({
        distDir: distDirectory,
        backendTarget: "file:///etc/passwd",
      }),
    /http or https/,
  );
  assert.throws(
    () =>
      createFrontendServer({
        distDir: distDirectory,
        backendTarget: "http://backend:8080/prefix",
      }),
    /without a path/,
  );
});
