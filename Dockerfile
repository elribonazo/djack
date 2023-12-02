FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
RUN apt-get update && apt-get install python3 cmake g++ -y
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm deploy --filter=@djack-sdk/signal --prod /prod/signal
RUN pnpm deploy --filter=@djack-sdk/server --prod /prod/server

FROM base AS signaling
COPY --from=build /prod/signal /usr/src/app
COPY ./packages/signal /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "/usr/src/app/build/index.js" ]

FROM base AS server
COPY --from=build /prod/server /usr/src/app
COPY ./packages/frontend/out /frontend/out
COPY ./packages/server /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "/usr/src/app/build/index.js" ]