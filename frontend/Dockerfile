FROM node:22-alpine@sha256:ab07539e0988b63558ff621f5fbe1077054c39d9809112974fb79993949d41cd AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine@sha256:ab07539e0988b63558ff621f5fbe1077054c39d9809112974fb79993949d41cd AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5173
WORKDIR /app

# Vite and all npm dependencies remain in the build stage. The production
# stage contains only the compiled SPA and this stdlib-only HTTP server.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs

USER node
EXPOSE 5173
CMD ["node", "server.mjs"]
