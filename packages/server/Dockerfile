FROM node:lts
RUN apt-get update
RUN apt-get install -y openssl cmake
RUN rm -rf /var/lib/apt/lists/*
RUN mkdir -p  /usr/src/app
WORKDIR /usr/src/app
ENV NODE_ENV=development
ARG NODE_ENV=development
COPY ./packages/server/package.json /usr/src/app/package.json
RUN npm install 

COPY ./packages/frontend/out /frontend/out
COPY ./packages/server /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "/usr/src/app/build/index.js" ]
