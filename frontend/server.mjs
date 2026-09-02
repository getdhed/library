import { createReadStream, realpathSync, statSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".ttf", "font/ttf"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const staticSecurityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self'",
    "connect-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
  ].join("; "),
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

function parseBackendTarget(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    throw new Error("BACKEND_PROXY_TARGET must be a valid http(s) URL");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("BACKEND_PROXY_TARGET must use http or https");
  }
  if (target.username || target.password || target.search || target.hash) {
    throw new Error("BACKEND_PROXY_TARGET must not contain credentials, query, or fragment");
  }
  if (target.pathname !== "/") {
    throw new Error("BACKEND_PROXY_TARGET must contain only an origin, without a path");
  }
  return target;
}

function connectionHeaderTokens(headers) {
  const value = headers.connection;
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return new Set(
    values
      .flatMap((item) => item.split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function sanitizeProxyHeaders(headers) {
  const connectionTokens = connectionHeaderTokens(headers);
  const clean = {};

  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    if (
      value === undefined ||
      hopByHopHeaders.has(lowerName) ||
      connectionTokens.has(lowerName)
    ) {
      continue;
    }
    clean[lowerName] = value;
  }
  return clean;
}

function headerValue(value) {
  return Array.isArray(value) ? value.join(", ") : value;
}

function forwardedFor(existingValue, req) {
  const existing = headerValue(existingValue);
  const peer = req.socket.remoteAddress;
  if (existing && peer) return `${existing}, ${peer}`;
  return existing || peer;
}

function setStaticSecurityHeaders(res) {
  for (const [name, value] of Object.entries(staticSecurityHeaders)) {
    res.setHeader(name, value);
  }
}

function sendText(req, res, statusCode, message, extraHeaders = {}) {
  const body = Buffer.from(`${message}\n`, "utf8");
  setStaticSecurityHeaders(res);
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

function decodedStaticPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  if (decoded.includes("\0") || decoded.includes("\\")) return undefined;
  return decoded;
}

async function regularFileWithin(root, candidate) {
  if (!isWithin(root, candidate)) return undefined;

  let realCandidate;
  try {
    realCandidate = realpathSync(candidate);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return undefined;
    throw error;
  }
  if (!isWithin(root, realCandidate)) return undefined;

  const fileStat = await stat(realCandidate);
  return fileStat.isFile() ? { path: realCandidate, stat: fileStat } : undefined;
}

function hasFileExtension(pathname) {
  return path.posix.basename(pathname).includes(".");
}

function acceptsHtml(req) {
  return headerValue(req.headers.accept)?.toLowerCase().includes("text/html") || false;
}

async function serveStatic(req, res, requestUrl, distRoot, indexFile) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(req, res, 405, "Method Not Allowed", { Allow: "GET, HEAD" });
    return;
  }

  const decodedPath = decodedStaticPath(requestUrl.pathname);
  if (decodedPath === undefined) {
    sendText(req, res, 400, "Bad Request");
    return;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  const candidate = path.resolve(distRoot, relativePath || "index.html");
  if (!isWithin(distRoot, candidate)) {
    sendText(req, res, 400, "Bad Request");
    return;
  }

  let file = await regularFileWithin(distRoot, candidate);
  let isIndex = relativePath === "" || relativePath === "index.html";

  if (!file) {
    if (
      decodedPath.startsWith("/assets/") ||
      (hasFileExtension(decodedPath) && !acceptsHtml(req))
    ) {
      sendText(req, res, 404, "Not Found");
      return;
    }
    file = indexFile;
    isIndex = true;
  }

  setStaticSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader("Content-Length", file.stat.size);
  res.setHeader(
    "Content-Type",
    contentTypes.get(path.extname(file.path).toLowerCase()) || "application/octet-stream",
  );
  res.setHeader(
    "Cache-Control",
    isIndex
      ? "no-cache"
      : decodedPath.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
  );
  res.setHeader("Last-Modified", file.stat.mtime.toUTCString());

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = createReadStream(file.path);
  stream.on("error", (error) => {
    if (!res.headersSent) sendText(req, res, 500, "Internal Server Error");
    else res.destroy(error);
  });
  res.on("error", (error) => stream.destroy(error));
  res.on("close", () => {
    if (!res.writableEnded) stream.destroy();
  });
  stream.pipe(res);
}

function proxyApi(req, res, target, logger) {
  const headers = sanitizeProxyHeaders(req.headers);
  const forwardedHost = headerValue(headers["x-forwarded-host"]) || headerValue(headers.host);
  headers.host = target.host;

  const clientAddress = forwardedFor(headers["x-forwarded-for"], req);
  if (clientAddress) headers["x-forwarded-for"] = clientAddress;
  if (forwardedHost) headers["x-forwarded-host"] = forwardedHost;
  const incomingProtocol = headerValue(headers["x-forwarded-proto"])?.toLowerCase();
  headers["x-forwarded-proto"] = ["http", "https"].includes(incomingProtocol)
    ? incomingProtocol
    : req.socket.encrypted
      ? "https"
      : "http";

  const transport = target.protocol === "https:" ? https : http;
  let responseStarted = false;
  const upstream = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      method: req.method,
      path: req.url,
      headers,
    },
    (upstreamResponse) => {
      responseStarted = true;
      const responseHeaders = sanitizeProxyHeaders(upstreamResponse.headers);
      res.writeHead(upstreamResponse.statusCode || 502, responseHeaders);

      upstreamResponse.on("error", (error) => res.destroy(error));
      upstreamResponse.on("aborted", () => res.destroy());
      res.on("error", () => upstreamResponse.destroy());
      res.on("close", () => {
        if (!res.writableEnded) upstreamResponse.destroy();
      });
      upstreamResponse.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    if (responseStarted) return;
    if (res.writableEnded || res.destroyed) return;
    logger.error?.(`frontend proxy error: ${error.message}`);
    if (!res.headersSent) sendText(req, res, 502, "Bad Gateway");
    else res.destroy(error);
  });

  req.on("aborted", () => upstream.destroy());
  req.on("error", (error) => upstream.destroy(error));
  res.on("close", () => {
    if (!res.writableEnded) upstream.destroy();
  });
  req.pipe(upstream);
}

function parseRequestUrl(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith("/") || rawUrl.startsWith("//")) return undefined;
  try {
    return new URL(rawUrl, "http://frontend.invalid");
  } catch {
    return undefined;
  }
}

export function createFrontendServer({
  distDir = process.env.DIST_DIR || path.join(moduleDirectory, "dist"),
  backendTarget = process.env.BACKEND_PROXY_TARGET || "http://localhost:8080",
  logger = console,
} = {}) {
  const distRoot = realpathSync(distDir);
  const indexPath = realpathSync(path.join(distRoot, "index.html"));
  if (!isWithin(distRoot, indexPath)) throw new Error("dist/index.html must be inside dist");
  const indexFile = { path: indexPath, stat: statSync(indexPath) };
  if (!indexFile.stat.isFile()) throw new Error("dist/index.html must be a regular file");
  const target = parseBackendTarget(backendTarget);

  const server = http.createServer((req, res) => {
    const requestUrl = parseRequestUrl(req.url);
    if (!requestUrl) {
      sendText(req, res, 400, "Bad Request");
      return;
    }

    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      try {
        proxyApi(req, res, target, logger);
      } catch (error) {
        logger.error?.(`frontend proxy setup error: ${error.message}`);
        sendText(req, res, 502, "Bad Gateway");
      }
      return;
    }

    void serveStatic(req, res, requestUrl, distRoot, indexFile)
      .catch((error) => {
        logger.error?.(`frontend static server error: ${error.message}`);
        if (!res.headersSent) sendText(req, res, 500, "Internal Server Error");
        else res.destroy(error);
      });
  });

  server.requestTimeout = 10 * 60 * 1000;
  server.headersTimeout = 30 * 1000;
  server.keepAliveTimeout = 5 * 1000;
  server.maxHeadersCount = 100;
  server.on("clientError", (_error, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });
  server.on("upgrade", (_request, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\n\r\n");
  });
  return server;
}

function listen(server) {
  const host = process.env.HOST || "0.0.0.0";
  const rawPort = process.env.PORT || "5173";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  server.listen(port, host, () => {
    console.log(`frontend listening on http://${host}:${port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`received ${signal}; shutting down frontend`);
    const forcedExit = setTimeout(() => {
      server.closeAllConnections();
      process.exitCode = 1;
    }, 20_000);
    forcedExit.unref();
    server.close((error) => {
      clearTimeout(forcedExit);
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

const isEntryPoint =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isEntryPoint) listen(createFrontendServer());
