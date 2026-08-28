FROM golang:1.25-alpine AS builder

# Get git
RUN apk update && \
    apk upgrade && \
    apk add --no-cache git && \
    apk add --no-cache tzdata

# Add user for golang and maintainer
# RUN addgroup -S golang && adduser -S golang -G golang
# USER golang:golang

# Working directory
ADD . /app
WORKDIR /app

COPY . .

ENV GOPRIVATE=bitbucket.org/log-tech/*
ENV BITBUCKET_USERNAME=<USERNAME>
ENV BITBUCKET_TOKEN=<APP_PASSWORD_OR_TOKEN>

RUN git config --global url."https://${BITBUCKET_USERNAME}:${BITBUCKET_TOKEN}@bitbucket.org/".insteadOf "https://bitbucket.org/"

# Building
RUN go mod download
RUN go mod tidy

# Jalankan build menggunakan build.sh
#RUN chmod +x build.sh && ./build.sh linux
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ./__build/release/bin/server ./server.go

# Start from scratch
FROM alpine:latest

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
RUN cp /usr/share/zoneinfo/Asia/Jakarta /etc/localtime && echo "Asia/Jakarta" > /etc/timezone

COPY --from=builder /app/__build/release /app/

RUN chmod 755 -R /app
WORKDIR /app/bin

EXPOSE 8080 28080

CMD ["./server"]
