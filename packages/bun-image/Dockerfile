# ---------- Stage 1: Build ----------
FROM oven/bun:1-slim AS bun

FROM alpine:3.18 AS alpine
RUN apk add upx
COPY --from=bun /usr/local/bin/bun /usr/local/bin/
WORKDIR /usr/local/bin
# Compress bun binary
RUN upx --all-methods bun

FROM frolvlad/alpine-glibc AS bun-custom
COPY --from=alpine /usr/local/bin/bun /usr/local/bin/
