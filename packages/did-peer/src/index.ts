import type { Service, VerificationMethod } from "didcomm-node";

export type KeyTuples<T1 = string[], T2 = string[]> = [T1, T2];
export type PeerDIDComposition<
  Authentication = string[],
  KeyAgreement = string[],
  VerificationMethods = VerificationMethod[],
  Services = Service[]
> = [Authentication, KeyAgreement, VerificationMethods, Services];

export * from "./Factory";
export * from "./x25519/create";
export * from "./x25519/PublicKey";
export * from "./x25519/PrivateKey";
export * from "./ed25519/PublicKey";
export * from "./ed25519/PrivateKey";
export * from "./ed25519/create";
export * from "./Peer";
