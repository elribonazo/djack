import { Buffer } from "buffer/index.js";
import { base64url } from "multiformats/bases/base64";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { StreamHandler } from "@libp2p/interface/stream-handler";
import type { Libp2p } from "libp2p";
import type { Service } from "didcomm";
import type { PubSub } from "@libp2p/interface/pubsub";
import type { GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import { type Transport } from "@libp2p/interface/transport";
import { RecursivePartial } from "@libp2p/interface";
import { Components } from "libp2p/components";
import { PeerDiscovery } from "@libp2p/interface/peer-discovery";

export abstract class AbstractStore {
  abstract findKeysByDID(search?: {
    did?: string | string[];
    peerId?: string | string[];
  }): Promise<PrivateKey[]>;
  abstract addDIDKey(did: DID, peerId: PeerId, key: PrivateKey): Promise<void>;
  abstract findAllDIDs(): Promise<DID[]>;
}
export type StorageInterface = { store: AbstractStore };
export type RegistryInterface = {
  fetchCredentialSchemaById(credentialSchemaId: string): Promise<any>;
  fetchCredentialDefinitionId(credentialDefinitionId: string): Promise<any>;
};

export enum PROTOCOLS {
  emailExchangeAuthenticate = "/email-exchange/v1/authenticate",
  emailExchangePresentation = "/email-exchange/v1/present-proof/3.0/presentation",
  emailExchangePresentationRequest = "/email-exchange/v1/present-proof/3.0/request-presentation",
  emailExchangeDelivery = "/email-exchange/v1/delivery",
  credentialOfferRequest = "/email-exchange/v1/issue-credential/3.0/offer-credential-request",
  credentialOffer = "/email-exchange/v1/issue-credential/3.0/offer-credential",
  credentialRequest = "/email-exchange/v1/issue-credential/3.0/request-credential",
  credentialIssue = "/email-exchange/v1/issue-credential/3.0/issue-credential",
}

const protocolDomain = "https://djack.email";

export function toDIDCOMMType(protocol: PROTOCOLS) {
  return `${protocolDomain}${protocol}`;
}

export function fromDIDCOMMType(type: string) {
  const convertProtocol = type.replace(protocolDomain, "");
  const protocolValue =
    Object.keys(PROTOCOLS)[
      Object.values(PROTOCOLS).findIndex((value) => value === convertProtocol)
    ];
  if (protocolValue in PROTOCOLS) {
    console.log(`Protocol from JSON ${protocolValue}`);
    return protocolValue as PROTOCOLS;
  }
  throw new Error(`Invalid protocol ${convertProtocol}`);
}

export type ExcludeKeys<T, K extends keyof T> = Omit<T, K>;

export type Handlers<Protocol = string, Handler = StreamHandler> = [
  Protocol,
  Handler
];

export type DIDFactoryAbstract = {
  storage: StorageInterface;
  createPeerDID(services: Service[]): Promise<DID>;
  createPeerDIDWithKeys(keyPairs: KeyPair[], services: Service[]): Promise<DID>;
};

export type DEFAULT_SERVICES = {
  pubsub?: PubSub<GossipsubEvents>;
  identify?: unknown;
  autoNAT?: unknown;
  dcutr?: unknown;
};

export type ExtendServices<T extends Record<string, any>> = {
  [K in keyof T]: unknown;
};

export type NODE_SERVICES<T extends Record<string, any>> = DEFAULT_SERVICES &
  ExtendServices<T>;

export type CreateNodeOptions<
  T extends Record<string, unknown> = DEFAULT_SERVICES
> = {
  keyPair?: KeyPair;
  domain: string;
  didWebHostname: string;
  publicKeys?: PublicKey[];
  listen: string[];
  storage: StorageInterface;
  factory: DIDFactoryAbstract;
  registry: RegistryInterface;
  services?: ExtendServices<T>;
  transports?: ((components: any) => Transport)[];
  peerDiscovery?: RecursivePartial<
    ((components: Components) => PeerDiscovery)[] | undefined
  >;
};

export interface NodeOptions<T extends Record<string, unknown>>
  extends ExcludeKeys<CreateNodeOptions<T>, "publicKeys"> {
  did: DID;
  cardanoDID: DID;
  peerdid: DID;
  p2p: Libp2p<NODE_SERVICES<T>>;
}

export class DIDUrl {
  did: DID;
  path: string[];
  parameters: Map<string, string>;
  fragment: string;

  constructor(
    did: DID,
    path: string[] = [],
    parameters: Map<string, string> = new Map(),
    fragment = ""
  ) {
    this.did = did;
    this.path = path;
    this.parameters = parameters;
    this.fragment = fragment;
  }

  toString(): string {
    return `${this.did}${this.fragmentString()}`;
  }

  pathString(): string {
    return `/${this.path.join("/")}`;
  }

  queryString(): string {
    return `?${Array.from(this.parameters.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("&")}`;
  }

  fragmentString(): string {
    return `#${this.fragment}`;
  }

  static fromString(didString: string) {
    const regex =
      /^did:(?<method>[a-z0-9]+(:[a-z0-9]+)*):(?<idstring>[^#?/]*)(?<path>[^#?]*)?(?<query>\?[^#]*)?(?<fragment>#.*)?$/gi;
    const match = regex.exec(didString);
    if (!match || !match.groups) {
      throw new Error("Invalid did string");
    }
    const { method, idstring, fragment = "", query = "", path } = match.groups;
    let attributes = new Map();
    if (query) {
      attributes = query
        .slice(1)
        .split("&")
        .map((queryAttribute) => queryAttribute.split("="))
        .reduce((all, [varName, varValue]) => {
          all.set(varName, varValue);
          return all;
        }, new Map());
    }

    const did = DID.fromString(`did:${method}:${idstring}`);
    const paths = path ? path.split("/").filter((p) => p) : [];
    return new DIDUrl(did, paths, attributes, fragment.slice(1));
  }
}

export class DID {
  public readonly schema: string;
  public readonly method: string;
  public readonly methodId: string;

  constructor(schema: string, method: string, methodId: string) {
    this.schema = schema;
    this.method = method;
    this.methodId = methodId;
  }

  toString() {
    return `${this.schema}:${this.method}:${this.methodId}`;
  }

  static fromString(text: string): DID {
    const schema = DID.getSchemaFromString(text);
    const method = DID.getMethodFromString(text);
    const methodId = DID.getMethodIdFromString(text);

    if (schema === undefined) {
      throw new Error("Invalid DID string, missing scheme");
    }
    if (method === undefined) {
      throw new Error("Invalid DID string, missing method name");
    }
    if (methodId === undefined) {
      throw new Error("Invalid DID string, missing method ID");
    }

    return new DID(schema, method, methodId);
  }

  static getSchemaFromString(text: string): string | undefined {
    const split = text.split(":");
    return split.at(0);
  }

  static getMethodFromString(text: string): string | undefined {
    const split = text.split(":");
    return split.at(1);
  }

  static getMethodIdFromString(text: string): string {
    const split = text.split(":");
    return split.slice(2).join(":");
  }
}

export abstract class AbstractSigningKey {
  abstract sign(message: Buffer): Buffer;
}

export abstract class AbstractVerifyingKey {
  abstract verify(message: Buffer, signature: Buffer): boolean;
}

export abstract class AbstractExportingKey {
  abstract export(format: ExportFormats): Uint8Array;
}

export abstract class Key {
  abstract type: Curve;
  abstract raw: Uint8Array;
  abstract options: Map<KeyProperties | string, string>;

  get curve() {
    const curveOption = this.getOption(KeyProperties.curve);
    if (!curveOption) {
      throw new Error("Invalid curve option not set");
    }
    return curveOption;
  }

  get encoded() {
    return base64url.baseEncode(this.raw);
  }

  setOption(name: string, value: string) {
    return this.options.set(name, value);
  }

  getOption(name: string) {
    return this.options.get(name);
  }
}

export abstract class PublicKey extends Key implements AbstractExportingKey {
  canVerify(): this is AbstractVerifyingKey {
    return "verify" in this;
  }

  export(format: ExportFormats): Uint8Array {
    if (format === ExportFormats.JWK) {
      return Buffer.from(
        JSON.stringify({
          crv: this.curve,
          kty: "OKP",
          x: this.encoded,
        })
      );
    }
    throw new Error("Method not implemented.");
  }
}
export abstract class PrivateKey extends Key implements AbstractExportingKey {
  abstract public: PublicKey;

  canSign(): this is AbstractSigningKey {
    return "sign" in this;
  }

  export(format: ExportFormats): Uint8Array {
    if (format === ExportFormats.JWK) {
      return Buffer.from(
        JSON.stringify({
          crv: this.curve,
          kty: "OKP",
          x: this.public.encoded,
          d: this.encoded,
        })
      );
    }
    throw new Error("Method not implemented.");
  }
}

export enum KeyProperties {
  curve = "curve",
}

export enum Curve {
  X25519 = "X25519",
  ED25519 = "Ed25519",
}

export enum ExportFormats {
  JWK = "JWK",
}

export type OctetPublicKey = {
  kty: "OKP";
  crv: string;
  x: Uint8Array;
};

export type KeyPair = {
  private: PrivateKey;
  public: PublicKey;
};
