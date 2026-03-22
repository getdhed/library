FROM golang:1.24.5 AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache python3 py3-pip \
  && pip3 install --break-system-packages --no-cache-dir pypdfium2 pillow
COPY --from=build /app/server ./server
COPY scripts ./scripts
COPY storage ./storage
EXPOSE 8080
CMD ["./server"]
