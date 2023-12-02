import type { PeerId } from "@libp2p/interface-peer-id";
import type { StreamHandler } from "@libp2p/interface/stream-handler";
import type { Libp2p } from "libp2p";
import { base64url } from "multiformats/bases/base64";
import type { Identify } from "@libp2p/identify";

import { type Transport } from "@libp2p/interface/transport";
import { RecursivePartial } from "@libp2p/interface";
import { Components } from "libp2p/components";
import { PeerDiscovery } from "@libp2p/interface/peer-discovery";
import {
  Domain,
  Ed25519PrivateKey,
  Ed25519PublicKey,
  X25519PrivateKey,
  X25519PublicKey
} from '@atala/prism-wallet-sdk';

export enum ExportFormats {
  JWK = "JWK",
}

export abstract class AbstractExportingKey extends Domain.Key {
  abstract export(format: ExportFormats): Uint8Array;
  abstract canExport(): this is AbstractExportingKey;
}

export class ExportableEd25519PublicKey extends Ed25519PublicKey implements AbstractExportingKey {
  canExport(): this is AbstractExportingKey {
    return "export" in this;
  }
  export(format: ExportFormats): Uint8Array {
    if (format === ExportFormats.JWK) {
      return Buffer.from(
        JSON.stringify({
          crv: this.curve,
          kty: "OKP",
          x: base64url.baseEncode(this.getEncoded()),
        })
      );
    }
    throw new Error("Method not implemented.");
  }
}

export class ExportableEd25519PrivateKey extends Ed25519PrivateKey implements AbstractExportingKey {
  canExport(): this is AbstractExportingKey {
    return "export" in this;
  }
  export(format: ExportFormats): Uint8Array {
    if (format === ExportFormats.JWK) {
      return Buffer.from(
        JSON.stringify({
          crv: this.curve,
          kty: "OKP",
          x: base64url.baseEncode(this.publicKey().getEncoded()),
          d: base64url.baseEncode(this.getEncoded()),
        })
      );
    }
    throw new Error("Method not implemented.");
  }
}

export class ExportableX25519PublicKey extends X25519PublicKey implements AbstractExportingKey {
  canExport(): this is AbstractExportingKey {
    return "export" in this;
  }
  export(format: ExportFormats): Uint8Array {
    if (format === ExportFormats.JWK) {
      return Buffer.from(
        JSON.stringify({
          crv: this.curve,
          kty: "OKP",
          x: Buffer.from(this.getEncoded()).toString(),
        })
      );
    }
    throw new Error("Method not implemented.");
  }
}

export class ExportableX25519PrivateKey extends X25519PrivateKey implements AbstractExportingKey {
  canExport(): this is AbstractExportingKey {
    return "export" in this;
  }
  export(format: ExportFormats): Uint8Array {
    if (format === ExportFormats.JWK) {
      return Buffer.from(
        JSON.stringify({
          crv: this.curve,
          kty: "OKP",
          x: Buffer.from(this.publicKey().getEncoded()).toString(),
          d: Buffer.from(this.getEncoded()).toString(),
        })
      );
    }
    throw new Error("Method not implemented.");
  }
}

export abstract class AbstractStore {
  abstract findKeysByDID(search?: {
    did?: string | string[];
    peerId?: string | string[];
  }): Promise<Domain.PrivateKey[]>;
  abstract addDIDKey(did: Domain.DID, peerId: PeerId, key: Domain.PrivateKey): Promise<void>;
  abstract findAllDIDs(): Promise<Domain.PeerDID[]>;
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
  castor: Domain.Castor;
  storage: StorageInterface;
  createPeerDID(services: Domain.Service[]): Promise<Domain.DID>;
  createPeerDIDWithKeys(keyPairs: Domain.KeyPair[], services: Domain.Service[]): Promise<Domain.DID>;
};

export type DEFAULT_SERVICES = {
  identify?: Identify;
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
  keyPair?: Domain.KeyPair;
  domain: string;
  didWebHostname: string;
  publicKeys?: (Domain.PublicKey & AbstractExportingKey)[];
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
  did: Domain.DID;
  cardanoDID: Domain.DID;
  peerdid: Domain.DID;
  p2p: Libp2p<NODE_SERVICES<T>>;
}
