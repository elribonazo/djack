/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SMTPServer } from "smtp-server";
import path from 'path';
import { Network } from "@djack-sdk/network";
import { DIDFactory } from "@djack-sdk/did-peer";
import { PROTOCOLS } from "@djack-sdk/interfaces";
import { type PeerId } from "@libp2p/interface-peer-id";
import type { Multiaddr } from "@multiformats/multiaddr";
import { StorageManager } from "@djack-sdk/shared";
import { Registry, registry } from "../registry";
import { createDIDRoute } from "../http/routes/did";
import { createCredentialOfferHandler } from "./handlers/credentialOffer";
import { createCredentialIssueHandler } from "./handlers/credentialIssue";
import { createOnData } from "../smtp/onData";
import { createOnRcptTo } from "../smtp/onRcptTo";
import { DEFAULT_HTTP_PORT } from "../Config";
import { AKEY, MailServerProps, ServerConstructorProps } from "../types";
import { webSockets } from "@libp2p/websockets";
import * as filters from "@libp2p/websockets/filters";
import { identify } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { fileURLToPath } from "url";

import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { kadDHT } from "@libp2p/kad-dht";
import { autoNAT } from "@libp2p/autonat";
import { dcutr } from "@libp2p/dcutr";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";
import { webRTCDirect, webRTC } from "@libp2p/webrtc";
import HTTP from "@djack-sdk/signal/build/http";
import { createCredentialDefinitionRoute } from "../http/routes/credentialDefinitions";
import { createCredentialSchemaRoute } from "../http/routes/credentialSchema";
import { AccountArray } from "./account";
import { createExchangeDelivery } from "./handlers/exchangeDelivery";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Server<T extends Record<string, unknown>> {
  private abortController;
  private instance: SMTPServer;
  public accounts = new AccountArray();

  get did() {
    return this.network.did;
  }

  get peerdid() {
    return this.network.peerdid;
  }

  get cardanoDID() {
    return this.network.cardanoDID;
  }

  get domain() {
    return this.network.domain;
  }

  get peer() {
    return this.network.peer;
  }

  static async create(options: ServerConstructorProps) {
    const storage = new StorageManager(options.storage);
    const factory = new DIDFactory(storage);

    const http = HTTP.create({
      cert: options.cert,
      key: options.key,
      routes: [
        {
          method: "get",
          url: "/peers/:peerId/did.json",
          route: createDIDRoute(storage, options.domain),
        },
        {
          method: "get",
          url: "/peers/:peerId/definitions/:definitionId.json",
          route: createCredentialDefinitionRoute(),
        },
        {
          method: "get",
          url: "/peers/:peerId/schemas/:schemaId.json",
          route: createCredentialSchemaRoute(),
        },
      ],
    });

    const staticWebsitePath = process.env.STATIC_WEBSITE_PATH || path.resolve(__dirname, "../../frontend/build")
    console.log("Resolving FE from ", staticWebsitePath)
    http.enableStatic(staticWebsitePath);

    const filter =
      process.env.FILTER && process.env.FILTER === "dns"
        ? filters.dnsWss
        : filters.all;

    const websockets = webSockets({
      websocket: http.websocket._opts,
      server: http.server,
      filter: filter,
    });

    const didWebHost =
      process.env.PUBLIC_DIDWEB_HOST! === "localhost"
        ? "localhost:8080"
        : process.env.PUBLIC_DIDWEB_HOST!;

    const network = await Network.createNode({
      didWebHostname: didWebHost,
      keyPair: options.p2p.keyPair,
      domain: options.domain,
      listen: [
        process.env.LISTENER || `/ip4/0.0.0.0/tcp/${DEFAULT_HTTP_PORT}/wss`,
      ],
      storage: storage,
      factory: factory,
      registry: registry,
      transports: [
        websockets,
        webRTC(),
        webRTCDirect(),
        circuitRelayTransport({
          discoverRelays: 2,
        }),
      ],
      services: {
        identify: identify(),
        autoNAT: autoNAT(),
        dcutr: dcutr(),
        dht: kadDHT({
          validators: { ipns: ipnsValidator },
          selectors: { ipns: ipnsSelector },
        }),
        ping: ping(),
      },
    });

    options.mail.cert = options.cert;
    options.mail.key = options.key;

    return new Server(network, options.mail, factory, storage, registry, http);
  }

  constructor(
    public network: Network<T>,
    private mail: MailServerProps,
    private factory: DIDFactory,
    public storage: StorageManager,
    private registry: Registry,
    private http: HTTP
  ) {
    this.abortController = new AbortController();
    this.instance = new SMTPServer({
      ...mail,
      authOptional: true,
      onRcptTo: createOnRcptTo(this.accounts, network, this.registry),
      onData: createOnData(this.accounts, network),
    });

    this.instance.on("error", (err) => {
      console.error("SMTP Server Error:", err);
    });

    network.addHandler(
      PROTOCOLS.credentialOfferRequest,
      createCredentialOfferHandler(network)
    );

    network.addHandler(
      PROTOCOLS.credentialIssue,
      createCredentialIssueHandler(network, this.accounts)
    );

    network.addHandler(
      PROTOCOLS.emailExchangeDelivery,
      createExchangeDelivery(network, this.accounts)
    );
  }

  async start() {
    this.abortController = new AbortController();

    const serviceProtocol = this.network.getServiceProtocol(
      PROTOCOLS.credentialOfferRequest
    );

    this.network.p2p.addEventListener("peer:identify", ({ detail }) => {
      const listenerAddress = detail.listenAddrs;
      this.network.onPeerDiscovery!({
        id: detail.peerId,
        multiaddrs: listenerAddress,
        protocols: detail.protocols,
      });
    });

    this.network.onPeerDiscovery = this.onPeerDiscovery.bind(this);

    console.log("Registering protocol", serviceProtocol);
    await this.network.p2p.register(serviceProtocol, {
      onDisconnect: this.onPeerDisconnected.bind(this),
    });

    await this.network.start();
    return new Promise<void>((resolve, reject) => {
      try {
        const { port } = this.mail;
        this.instance.listen(port, () => {
          console.log("Email Server Started on port", port);
          return resolve();
        });
      } catch (err) {
        return reject(err);
      }
    });
  }

  async onPeerDisconnected(peer: PeerId) {
    const index = this.accounts.findIndex(
      (account) => account[AKEY.PEERID] !== peer.toString()
    );
    if (index >= 0) {
      this.accounts.splice(index, 1);
    }
  }

  async onPeerDiscovery({
    id,
    multiaddrs,
    protocols,
  }: {
    id: PeerId;
    multiaddrs: Multiaddr[];
    protocols: string[];
  }) {
    this.network.p2p.peerStore.save(id, { multiaddrs, protocols });
  }
}
