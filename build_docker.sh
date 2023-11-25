#!bin/bash

npm run build

docker buildx create --use

docker buildx build --platform linux/amd64 . -f ./packages/server/Dockerfile -t elribonazo/djack-server --push
docker buildx build --platform linux/amd64 . -f ./packages/signal/Dockerfile -t elribonazo/djack-signaling --push