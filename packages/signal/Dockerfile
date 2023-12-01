FROM node:lts AS Signalinstaller
# Install OpenSSL
RUN apt-get update && apt-get install -y openssl
# Install pnpm globally
RUN mkdir -p  /usr/src/app
WORKDIR /usr/src/app
ENV NODE_ENV=development
ARG NODE_ENV=development
COPY ./packages/signal/package.json /usr/src/app/package.json
RUN npm install 

FROM node:lts
# Use pnpm for package installation
COPY --from=Signalinstaller /usr/src/app /usr/src/app/
COPY ./packages/signal /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "/usr/src/app/build/index.js" ]