import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import https from "https";
import http from "http";

import cors from "cors";
import path from "path";
import { Server as WebsocketServer } from "socket.io";

const __dirname = path.dirname(process.cwd());

const corsDomains = process.env.CORS_ALLOW || "";
const whitelist: string[] = corsDomains.split(",");


export type AsyncRoute = (req: Request, res: Response) => Promise<void>;
export type SyncRoute = (req: Request, res: Response) => void;

export type RouteFn = AsyncRoute | SyncRoute;
export type Route = {
  route: RouteFn;
  method: SupportedMethods;
  url: string;
};
export type SupportedMethods = "post" | "get" | "put" | "delete" | "patch";
export type CreateHttpOptions = {
  routes?: Route[];
} & HTTPServerOptions;

export type HTTPServerOptions = {
  cert?: Buffer;
  key?: Buffer;
};

export default class HTTP {
  public server: https.Server | http.Server;
  public websocket: WebsocketServer;

  get isSecure() {
    return this.server instanceof https.Server
  }

  constructor(public app: Express, options: HTTPServerOptions) {
    console.log("HttpServer", options)
    const { cert, key } = options;
    this.server =
      cert && key
        ? https.createServer(
          {
            cert,
            key,
          },
          app
        )
        : http.createServer(app);
    this.websocket = new WebsocketServer(this.server);

    this.app.use(bodyParser.json());
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (origin) {
            if (process.env.NODE_ENV === "development") {
              callback(null, true);
            } else {
              if (whitelist.indexOf("*") !== -1 || whitelist.indexOf(origin) !== -1) {
                callback(null, true);
              } else {
                callback(null, false);
              }
            }
          } else {
            callback(null, true);
          }
        },
        methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
        credentials: true, //Credentials are cookies, authorization headers or TLS client certificates.
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "device-remember-token",
          "Access-Control-Allow-Origin",
          "Origin",
          "Accept",
        ],
      })
    );
  }

  enableStatic(staticPath: string) {
    console.log("enabling path ", staticPath);
    this.app.use(express.static(staticPath));
    /* final catch-all route to index.html defined last */
    this.app.get('/*', (req, res) => {
      res.sendFile(`${staticPath}/index.html`);
    })
  }

  static create(options: CreateHttpOptions) {
    const app = express();

    const server = new HTTP(app, options);

    options?.routes?.forEach(({ route, method, url }) => {
      app[method](url, route);
    });

    return server;
  }
}
