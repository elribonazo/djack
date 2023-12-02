/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Libp2p, createLibp2p } from "libp2p";
import { generateKeyPair, supportedKeys } from "@libp2p/crypto/keys";
import { peerIdFromKeys } from "@libp2p/peer-id";
import { type PeerId } from "@libp2p/interface-peer-id";
import { pipe } from "it-pipe";
import { yamux } from "@chainsafe/libp2p-yamux";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import type { StreamHandler } from "@libp2p/interface/stream-handler";
import { Multiaddr } from "@multiformats/multiaddr";
import { Buffer } from "buffer/index.js";
import type {
  DIDResolver, Secret, DIDDoc, Service
} from "didcomm-node";
import {
  Message
} from "didcomm-node";
import {
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
} from "@djack-sdk/interfaces";
import { Domain, Apollo, Castor, DIDCommWrapper, AnoncredsLoader } from '@atala/prism-wallet-sdk';

import type { DIDFactory } from "@djack-sdk/did-peer";
import {
  createX25519FromEd25519KeyPair,
  createX25519PublicKeyFromEd25519PublicKey,
} from "@djack-sdk/did-peer";
import { didUrlFromString } from "@djack-sdk/shared";

export * from "./Task";
export { AnoncredsLoader } from '@atala/prism-wallet-sdk';
export * from "./Protocols";

const apollo = new Apollo();
const castor = new Castor(apollo)
export const DIDCommMessagingKey = "DIDCommMessaging";
export const DIDCommMessagingEncodedKey = "dm";
export type ProtocolHandler<
  ProtocolName = string,
  ProtocolHandle = StreamHandler
> = [ProtocolName, ProtocolHandle];

export class ProtocolHandlers {
  constructor(public protocols: ProtocolHandler[] = []) { }
}

export async function getPeerIDDID(peer: PeerId): Promise<Domain.DID> {
  const publicKey = peer.publicKey?.slice(4);

  if (!publicKey) {
    throw new Error("No public key in peerId");
  }
  const unmarshalEd25519PublicKey =
    supportedKeys.ed25519.unmarshalEd25519PublicKey(publicKey);

  const ed25519Pub = new ExportableEd25519PublicKey(unmarshalEd25519PublicKey.marshal());
  const x25519Pub = createX25519PublicKeyFromEd25519PublicKey(ed25519Pub);
  const services = Network.getServicesForPeerDID(peer);


  return castor.createPeerDID([ed25519Pub, x25519Pub], services)
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
        this.didcomm = await DIDCommWrapper.getDIDComm();
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

    const peerDID = await castor.createPeerDID(
      keyPairs.map((keyPair) => keyPair.publicKey),
      this.getServicesForPeerDID(peerId)
    )


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

    const cardanoDID =
      publicKeys && publicKeys.length
        ? {
          cardanoDID: await castor.createPeerDID(
            publicKeys,
            [
              new Domain.Service(
                "didcomm",
                ["DIDCommMessaging"],
                {
                  uri: (await castor.createPeerDID(publicKeys, [])).toString(),
                  accept: ["didcomm/v2"],
                  routingKeys: []
                }
              )
            ]
          ),
        }
        : {
          cardanoDID: await castor.createPeerDID(
            [ed25519KeyPair.publicKey, x25519KeyPair.publicKey],
            [
              new Domain.Service(
                "didcomm",
                [
                  "DIDCommMessaging"
                ],
                {
                  uri: (await castor.createPeerDID([
                    ed25519KeyPair.publicKey,
                    x25519KeyPair.publicKey,
                  ], [])).toString(),
                  accept: ["didcomm/v2"],
                  routingKeys: []
                }
              )
            ]
          )
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

  static getServicesForPeerDID(peerId: PeerId): Domain.Service[] {
    return [
      new Domain.Service(
        "didcomm",
        ["DIDCommMessaging"],
        {
          uri: peerId.toString(),
          accept: ["didcomm/v2"],
          routingKeys: []
        }
      )
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

  get didResolver(): DIDResolver {
    return {
      resolve: async (did: string) => {
        const doc = await castor.resolveDID(did);

        const authentications: string[] = [];
        const keyAgreements: string[] = [];
        const services: Service[] = [];
        const verificationMethods: Domain.VerificationMethod[] = [];

        doc.coreProperties.forEach((coreProperty) => {
          if ("verificationMethods" in coreProperty) {
            coreProperty.verificationMethods.forEach((method) => {
              const curve = Domain.VerificationMethod.getCurveByType(
                method.publicKeyJwk?.crv || ""
              );

              switch (curve) {
                case Domain.Curve.ED25519:
                  authentications.push(method.id);
                  break;

                case Domain.Curve.X25519:
                  keyAgreements.push(method.id);
                  break;
              }
              const publicKeyBase64 = method.publicKeyJwk?.x as any;
              const publicKeyKid = (method.publicKeyJwk as any).kid;
              if (!method.publicKeyJwk) {
                throw new Error("Only JWK allowed")
              }
              verificationMethods.push({
                controller: method.controller,
                id: method.id,
                type: "JsonWebKey2020",
                publicKeyJwk: {
                  crv: method.publicKeyJwk?.crv,
                  kid: publicKeyKid,
                  kty: "OKP",
                  x: publicKeyBase64,
                },
              });
            });
          }

          if (
            coreProperty instanceof Domain.Service &&
            coreProperty.type.includes(DIDCommMessagingKey)
          ) {
            services.push({
              id: coreProperty.id,
              type: DIDCommMessagingKey,
              serviceEndpoint: {
                uri: coreProperty.serviceEndpoint.uri,
                accept: coreProperty.serviceEndpoint.accept,
                routing_keys: coreProperty.serviceEndpoint.routingKeys,
              },
            });
          }
        });

        const dcdoc: DIDDoc = {
          id: doc.id.toString(),
          authentication: authentications,
          keyAgreement: keyAgreements,
          service: services,
          verificationMethod: verificationMethods,
        };

        return dcdoc;
      },
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
        const found = peerDIDs.find((peerDIDSecret: any) => {
          return secretDID.did.toString() === peerDIDSecret.toString();
        });
        if (found) {
          const did = await castor.resolveDID(found.did.toString());
          const [publicKeyJWK] = did.coreProperties.reduce((all, property) => {
            if (property instanceof Domain.VerificationMethods) {
              const matchingValue: Domain.VerificationMethod | undefined =
                property.values.find(
                  (verificationMethod) => verificationMethod.id === secretId
                );

              if (matchingValue && matchingValue.publicKeyJwk) {
                return [...all, matchingValue.publicKeyJwk];
              }
            }
            return all;
          }, [] as Domain.PublicKeyJWK[]);
          if (publicKeyJWK) {
            const secret = this.mapToSecret(found, publicKeyJWK);
            return secret;
          }
        }

        return null;
      },
    };
  }

  private mapToSecret(
    peerDid: Domain.PeerDID,
    publicKeyJWK: Domain.PublicKeyJWK
  ): Secret {
    const privateKeyBuffer = peerDid.privateKeys.find(
      (key) => key.keyCurve.curve === Domain.Curve.X25519
    );
    if (!privateKeyBuffer) {
      throw new Error(`Invalid PrivateKey Curve ${Domain.Curve.X25519}`);
    }
    const privateKey = apollo.createPrivateKey({
      type: Domain.KeyTypes.Curve25519,
      curve: Domain.Curve.X25519,
      raw: privateKeyBuffer.value,
    });
    const ecnumbasis = castor.getEcnumbasis(
      peerDid.did,
      privateKey.publicKey()
    );
    const id = `${peerDid.did.toString()}#${ecnumbasis}`;

    const secret: Secret = {
      id,
      type: "JsonWebKey2020",
      privateKeyJwk: {
        crv: Domain.Curve.X25519,
        kty: "OKP",
        d: Buffer.from(privateKey.getEncoded()).toString(),
        x: publicKeyJWK.x,
      },
    };

    return secret;
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
