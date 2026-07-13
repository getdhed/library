FROM golang:1.25.0@sha256:5502b0e56fca23feba76dbc5387ba59c593c02ccc2f0f7355871ea9a0852cebe AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.21@sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d
WORKDIR /app
RUN apk add --no-cache python3 py3-pip postgresql17-client \
  && pip3 install --break-system-packages --no-cache-dir pypdfium2 pillow
COPY --from=build /app/server ./server
COPY scripts ./scripts

EXPOSE 8080
CMD ["./server"]
