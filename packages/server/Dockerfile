FROM node:lts AS ServerInstaller
# Install OpenSSL
RUN apt-get update && \
    apt-get install -y openssl cmake && \
    rm -rf /var/lib/apt/lists/*
# Install pnpm globally
RUN mkdir -p  /usr/src/app
WORKDIR /usr/src/app
ENV NODE_ENV=development
ARG NODE_ENV=development
COPY ./packages/server/package.json /usr/src/app/package.json
RUN npm install 

FROM node:lts
# Use pnpm for package installation
COPY --from=ServerInstaller /usr/src/app /usr/src/app/
COPY ./packages/frontend/out /frontend/out
COPY ./packages/server /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "/usr/src/app/build/index.js" ]
