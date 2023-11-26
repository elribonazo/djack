FROM node:lts


# Install OpenSSL
RUN apt-get update && apt-get install -y openssl

# Install pnpm globally
RUN mkdir -p  /usr/src/app

WORKDIR /usr/src/app
ENV NODE_ENV=development
ARG NODE_ENV=development
COPY ./packages/server/package.json /usr/src/app/package.json

# Use pnpm for package installation
RUN NODE_ENV=development npm install 

COPY ./packages/frontend/out /frontend/out
COPY ./packages/server /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "/usr/src/app/build/index.js" ]
