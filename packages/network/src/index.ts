/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Libp2p, createLibp2p } from "libp2p";
import { generateKeyPair, supportedKeys } from "@libp2p/crypto/keys";
import { peerIdFromKeys } from "@libp2p/peer-id";
import { type PeerId } from "@libp2p/interface-peer-id";
import { pipe } from "it-pipe";
import { yamux } from "@chainsafe/libp2p-yamux";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import { Message, Secret } from "didcomm-node";
import type { StreamHandler } from "@libp2p/interface/stream-handler";
import { Multiaddr } from "@multiformats/multiaddr";
import { Buffer } from "buffer/index.js";
import {
  ExportFormats,
  CreateNodeOptions,
  NodeOptions,
  PROTOCOLS,
  Handlers,
  RegistryInterface,
  StorageInterface,
  NODE_SERVICES,
  DEFAULT_SERVICES,
  ExportableEd25519PrivateKey,
  ExportableEd25519PublicKey,
  AbstractExportingKey,
} from "@djack-sdk/interfaces";
import { Domain } from '@atala/prism-wallet-sdk';

import type { DIDFactory } from "@djack-sdk/did-peer";
import {
  PeerDID,
  Ed25519PrivateKey,
  Ed25519PublicKey,
  createX25519FromEd25519KeyPair,
  createX25519PublicKeyFromEd25519PublicKey,
} from "@djack-sdk/did-peer";
import { AnoncredsLoader } from "./AnoncredsLoader";
import { getDidcommLibInstance } from "./didcomm";
import { didUrlFromString } from "@djack-sdk/shared";

export * from "./Task";
export * from "./AnoncredsLoader";
export * from "./Protocols";
//content

export type ProtocolHandler<
  ProtocolName = string,
  ProtocolHandle = StreamHandler
> = [ProtocolName, ProtocolHandle];

export class ProtocolHandlers {
  constructor(public protocols: ProtocolHandler[] = []) { }
}

export function getPeerIDDID(peer: PeerId): PeerDID {
  const publicKey = peer.publicKey?.slice(4);

  if (!publicKey) {
    throw new Error("No public key in peerId");
  }
  const unmarshalEd25519PublicKey =
    supportedKeys.ed25519.unmarshalEd25519PublicKey(publicKey);

  const ed25519Pub = new Ed25519PublicKey(unmarshalEd25519PublicKey.marshal());
  const x25519Pub = createX25519PublicKeyFromEd25519PublicKey(ed25519Pub);
  const services = Network.getServicesForPeerDID(peer);
  return new PeerDID([ed25519Pub, x25519Pub], services);
}

export class Network<T extends Record<string, unknown> = DEFAULT_SERVICES> {
  public static didcomm: typeof import("didcomm-node");
  public static _anoncreds: AnoncredsLoader | undefined;
  private handlers: Handlers[] = [];
  public did: Domain.DID;
  public didWebHostname: string;
  public peerdid: Domain.DID;
  public cardanoDID: Domain.DID;

  public p2p: Libp2p<NODE_SERVICES<T>>;
  public storage: StorageInterface;
  public factory: DIDFactory;
  public registry: RegistryInterface;
  public domain: string;

  public coreAbort!: AbortController;
  public aborts: AbortController[] = [];

  get abortController() {
    const abortController = new AbortController();
    this.aborts.push(abortController);
    return {
      signal: abortController.signal,
    };
  }

  constructor(options: NodeOptions<T>) {
    this.didWebHostname = options.didWebHostname;
    this.did = options.did;
    this.peerdid = options.peerdid;
    this.p2p = options.p2p;
    this.storage = options.storage;
    this.factory = options.factory;
    this.registry = options.registry;
    this.domain = options.domain;
    this.cardanoDID = options.cardanoDID;
  }

  public static async getDIDComm() {
    if (!this.didcomm) {
      if (typeof window !== "undefined")
        this.didcomm = await getDidcommLibInstance();
      else this.didcomm = await import("didcomm-node");
    }
    return this.didcomm;
  }

  public static async getAnoncreds() {
    if (!Network._anoncreds) {
      Network._anoncreds = await AnoncredsLoader.getInstance();
    }
    return Network._anoncreds;
  }

  get anoncreds() {
    if (Network._anoncreds === undefined) {
      throw new Error("Pollux - Anoncreds not loaded");
    }

    return Network._anoncreds;
  }

  private static async generateKeyPair(): Promise<Domain.KeyPair> {
    const prv = await generateKeyPair("Ed25519");

    const ed25519Prv = new ExportableEd25519PrivateKey(prv.marshal());

    const ed25519Pub = new ExportableEd25519PublicKey(prv.public.marshal());

    const ed25519KeyPair: Domain.KeyPair = {
      curve: Domain.Curve.ED25519,
      privateKey: ed25519Prv,
      publicKey: ed25519Pub,
    };

    return ed25519KeyPair;
  }

  get addresses() {
    const multiaddrs = this.p2p.getMultiaddrs().map((ma) => ma.toString());
    return multiaddrs;
  }

  protected static DEFAULT_LISTENERS = [];
  public static addDefaultListeners(listeners: string[]) {
    return Array.from(new Set([...listeners, ...this.DEFAULT_LISTENERS]));
  }

  static async createNode<T extends Record<string, unknown>>(
    options: CreateNodeOptions<T>
  ) {
    const {
      keyPair,
      storage,
      factory,
      registry,
      listen,
      domain,
      publicKeys,
      services,
      peerDiscovery,
    } = options;

    const ed25519KeyPair = keyPair ? keyPair : await this.generateKeyPair();

    const x25519KeyPair: Domain.KeyPair =
      createX25519FromEd25519KeyPair(ed25519KeyPair);

    const peerId = await peerIdFromKeys(
      new supportedKeys.ed25519.Ed25519PublicKey(ed25519KeyPair.publicKey.raw)
        .bytes,
      new supportedKeys.ed25519.Ed25519PrivateKey(
        ed25519KeyPair.privateKey.raw,
        ed25519KeyPair.publicKey.raw
      ).bytes
    );

    const keyPairs = [ed25519KeyPair, x25519KeyPair];
    const privateKeys = keyPairs.map((keyPair) => keyPair.privateKey);
    const did = new Domain.DID(
      "did",
      "web",
      `${options.didWebHostname}:peers:${peerId.toString()}`
    );

    const peerDID = new PeerDID(
      keyPairs.map((keyPair) => keyPair.publicKey),
      this.getServicesForPeerDID(peerId)
    );

    for (const priv of privateKeys) {
      await storage.store.addDIDKey(did, peerId, priv);
      await storage.store.addDIDKey(peerDID, peerId, priv);
    }

    const node = await createLibp2p({
      start: false,
      peerId: peerId,
      addresses: {
        listen: listen,
      },
      streamMuxers: [yamux(), mplex()],
      transports: options.transports,
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: () => {
          return false;
        },
      },
      services: services ? services : ({} as any),
      peerDiscovery: peerDiscovery,
    });

    if (publicKeys && publicKeys.length) {
      console.log(
        "Creating ",
        new PeerDID(publicKeys, [
          {
            id: "didcomm",
            type: "DIDCommMessaging",
            serviceEndpoint: {
              uri: new PeerDID(publicKeys).toString(),
              accept: ["didcomm/v2"],
            },
          },
        ]).toString()
      );
    }

    const cardanoDID =
      publicKeys && publicKeys.length
        ? {
          cardanoDID: new PeerDID(publicKeys, [
            {
              id: "didcomm",
              type: "DIDCommMessaging",
              serviceEndpoint: {
                uri: new PeerDID(publicKeys).toString(),
                accept: ["didcomm/v2"],
              },
            },
          ]),
        }
        : {
          cardanoDID: new PeerDID(
            [ed25519KeyPair.publicKey, x25519KeyPair.publicKey],
            [
              {
                id: "didcomm",
                type: "DIDCommMessaging",
                serviceEndpoint: {
                  uri: new PeerDID([
                    ed25519KeyPair.publicKey,
                    x25519KeyPair.publicKey,
                  ]).toString(),
                  accept: ["didcomm/v2"],
                },
              },
            ]
          ),
        };

    console.log("Cardnao did ", cardanoDID);

    return new Network({
      didWebHostname: options.didWebHostname,
      did,
      peerdid: peerDID,
      p2p: node,
      storage,
      registry,
      listen,
      factory,
      domain,
      ...cardanoDID,
    });
  }

  static getServicesForPeerDID(peerId: PeerId) {
    return [
      {
        id: "didcomm",
        type: "DIDCommMessaging",
        serviceEndpoint: {
          uri: peerId.toString(),
          accept: ["didcomm/v2"],
        },
      },
    ];
  }

  get address() {
    const [multiaddr] = this.p2p.getMultiaddrs();
    return multiaddr;
  }

  get services() {
    if (!this.p2p) return [];
    const peerId = this.p2p.peerId;
    return Network.getServicesForPeerDID(peerId);
  }

  get peer() {
    if (!this.p2p) return null;
    return this.p2p.peerId;
  }

  get didResolver() {
    return {
      resolve: async (did: string) => PeerDID.resolve(Domain.DID.fromString(did)),
    };
  }

  get secretResolver() {
    return {
      find_secrets: async (secretIds: string[]) => {
        const peerDIDs = await this.storage.store.findAllDIDs();
        const found = secretIds.filter((secretId) => {
          const secretDID = didUrlFromString(secretId);
          return peerDIDs.find(
            (secretPeerDID: any) =>
              secretPeerDID.toString() === secretDID.did.toString()
          );
        });
        return found;
      },
      get_secret: async (secretId: string) => {
        const peerDIDs = await this.storage.store.findAllDIDs();
        const secretDID = didUrlFromString(secretId);
        const found = peerDIDs.filter((peerDIDSecret: any) => {
          return secretDID.did.toString() === peerDIDSecret.toString();
        });
        if (found) {
          for (const key of found) {
            const didDocument = await PeerDID.resolve(key);
            const verificationMethod = didDocument.verificationMethod.find(
              (v: any) => v.id === secretId
            );
            if (verificationMethod) {
              const privateKeyRecords = await this.storage.store.findKeysByDID({
                did: found.map((did) => did.toString()),
              });
              const keys = privateKeyRecords.filter((record) => (record as unknown as AbstractExportingKey).canExport()) as unknown as AbstractExportingKey[]
              const foundPriv = keys.find(
                ({ type }: any) => type === Domain.Curve.X25519
              );
              if (foundPriv) {
                const secret: Secret = {
                  id: secretId,
                  type: "JsonWebKey2020",
                  privateKeyJwk: JSON.parse(
                    Buffer.from(foundPriv.export(ExportFormats.JWK)).toString()
                  ),
                };
                return secret;
              }
            }
          }
        }
        return null;
      },
    };
  }

  onPeerDiscovery?: (event: {
    id: PeerId;
    multiaddrs: Multiaddr[];
    protocols: string[];
  }) => void | Promise<void>;
  onPeerConnect?: (peer: PeerId) => void | Promise<void>;

  public validateProtocol(protocol: string): PROTOCOLS {
    const protocolKey = Object.values(PROTOCOLS).findIndex(
      (value) => value === protocol
    );

    if (protocolKey) {
      return Object.values(PROTOCOLS)[protocolKey];
    }

    throw new Error("Invalid Protocol " + protocol);
  }

  public addHandler(name: string, handler: StreamHandler) {
    const serviceHandle = this.getServiceProtocol(this.validateProtocol(name));
    console.log("AddedHandler", serviceHandle);
    this.handlers.push([serviceHandle, handler]);
  }

  private _onPeerConnect(evt: any) {
    const peer = evt.detail;
    console.log("n0 connected to: ", peer.toString());

    if (this.onPeerConnect) {
      this.onPeerConnect(peer);
    }
  }

  private async _onPeerDiscovery(evt: any) {
    const peer = evt.detail;
    console.log(
      `Peer ${this.p2p.peerId.toString()} discovered: ${peer.id.toString()} with protocols`,
      JSON.stringify(evt.detail.protocols)
    );
    if (this.onPeerDiscovery) {
      this.onPeerDiscovery(peer);
    }
  }

  public async stop() {
    this.coreAbort.abort(new Error("Stopping"));
    this.handlers.forEach(([protocol]) => {
      this.p2p.unhandle(protocol);
    });
    this.coreAbort.signal.removeEventListener("abort", () => {
      this.aborts.forEach((abort) => {
        abort.abort(new Error("aborted"));
      });
    });
    this.p2p.removeEventListener(
      "peer:discovery",
      this._onPeerDiscovery.bind(this)
    );
    this.p2p.removeEventListener(
      "peer:connect",
      this._onPeerConnect.bind(this)
    );
    return this.p2p.stop();
  }

  public getServiceProtocol(protocol: PROTOCOLS) {
    //TODO, HASH DOMAIN, option 1 with the node pubKey encoded or just sha512 it or something
    return `/service/djack.email${protocol}`;
  }

  public isValidServiceProvider(protocols: string[]) {
    return protocols.find((protocol) =>
      this.handlers.find(([protocolName]) => protocol === protocolName)
    );
  }

  public async start(abortController?: AbortController) {
    this.coreAbort = abortController || new AbortController();

    this.coreAbort.signal.addEventListener("abort", () => {
      this.aborts.forEach((abort) => {
        abort.abort(new Error("aborted"));
      });
    });

    this.handlers.forEach(([protocol, handler]) => {
      this.p2p.handle(
        protocol,
        (data) => {
          console.log(
            `[network][${protocol}] Connection request from ${data.connection.remotePeer.toString()}`
          );
          return handler(data);
        },
        { runOnTransientConnection: true }
      );
    });

    this.p2p.addEventListener("peer:connect", this._onPeerConnect.bind(this));

    this.p2p.addEventListener("peer:disconnect", (peerId) => {
      console.log(`⚡️[server]: Peer ${peerId.detail.toString()} disconnected`);
    });

    console.log(`⚡️[server]: Starting  node`);
    await this.p2p.start();
    console.log(`⚡️[server]: Started  node `, this.p2p.peerId.toString());

    if (this.addresses.length) {
      console.log(
        `⚡️[server]: Node is available at:  `,
        this.addresses.join(", ")
      );
    }
  }

  public async packMessage(
    from: string,
    to: string,
    message: Message
  ): Promise<Uint8Array> {
    const [encryptedMsg] = await message.pack_encrypted(
      to,
      from,
      null,
      this.didResolver,
      this.secretResolver,
      {
        enc_alg_anon: "Xc20pEcdhEsA256kw",
        enc_alg_auth: "A256cbcHs512Ecdh1puA256kw",
        forward: false,
        protect_sender: false,
      }
    );

    return Buffer.from(encryptedMsg);
  }

  async unpack(message: Uint8Array): Promise<Message> {
    const [didcommMsg] = await Message.unpack(
      Buffer.from(message).toString(),
      this.didResolver,
      this.secretResolver,
      {
        expect_decrypt_by_all_keys: false,
        unwrap_re_wrapping_forward: false,
      }
    );
    return didcommMsg;
  }

  public async dialProtocol(
    peer: PeerId | Multiaddr | Multiaddr[],
    protocols: string | string[]
  ) {
    const dial = {
      from: this.peer?.toString(),
      to: peer.toString(),
    };
    console.log(
      `[${JSON.stringify(protocols)}]: Dialing ${dial.from} to ${dial.to}`
    );
    const connection = await this.dial(peer);

    return connection.newStream(protocols, { runOnTransientConnection: true });
  }

  public async dial(peer: any) {
    return this.p2p.dial(peer, { signal: this.abortController.signal });
  }

  public async sendMessage(peer: any, protocol: string, message: Uint8Array) {
    const stream = await this.dialProtocol(peer, protocol);
    const result = await pipe([message], stream.sink);
    await stream.close({ signal: this.abortController.signal });
    return result;
  }

  public async sendAndGetResponse(
    peer: Multiaddr | Multiaddr[] | PeerId,
    protocol: string,
    message: Uint8Array
  ): Promise<Message> {
    try {
      const stream = await this.dialProtocol(peer, protocol);
      const results = new Promise<Message>((resolve, reject) => {
        return pipe([message], stream, async (source) => {
          try {
            for await (const data of source) {
              const unpacked = await this.unpack(data.subarray());
              return resolve(unpacked);
            }
          } catch (err) {
            console.log(err);
            return reject(err);
          }
        });
      });

      await results;
      await stream.close({ signal: this.abortController.signal });
      return results;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
