#!bin/bash
architecture=$(dirname "$0")
npm run build

docker buildx create --use

docker buildx build --platform linux/amd64,linux/arm64 . -f ./packages/server/Dockerfile -t elribonazo/djack-server --push
