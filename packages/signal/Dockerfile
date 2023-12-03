FROM node:lts

WORKDIR /usr/src/app
RUN apt-get update
RUN apt-get install -y openssl
RUN mkdir -p  /usr/src/app

ENV NODE_ENV=development
ARG NODE_ENV=development
RUN mkdir -p /iohk/atala-prism-wallet-sdk-ts 
COPY ./packages/signal/package.json /usr/src/app/package.json

COPY ./atala-prism-wallet-sdk-3.1.0.tgz /usr/atala-prism-wallet-sdk-3.1.0.tgz 
RUN npm install
COPY ./packages/signal /usr/src/app

ENV PORT=8080
EXPOSE 8080

CMD [ "npx", "@djack-sdk/signal" ]