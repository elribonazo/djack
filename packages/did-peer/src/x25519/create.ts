import {
  convertPublicKeyToX25519,
  convertSecretKeyToX25519,
} from "@stablelib/ed25519";

import type { KeyPair } from "@djack-sdk/interfaces";
import { Curve } from "@djack-sdk/interfaces";
import { X25519PublicKey } from "./PublicKey";
import { X25519PrivateKey } from "./PrivateKey";
import { Ed25519PublicKey } from "../ed25519/PublicKey";

export function createX25519FromEd25519KeyPair(keyPair: KeyPair): KeyPair {
  if (
    keyPair.private.curve !== Curve.ED25519 ||
    keyPair.public.curve !== Curve.ED25519
  ) {
    throw new Error("Invalid key curve");
  }

  const x25519Private = convertSecretKeyToX25519(keyPair.private.raw);
  const x25519Public = convertPublicKeyToX25519(keyPair.public.raw);

  return {
    public: new X25519PublicKey(x25519Public),
    private: new X25519PrivateKey(x25519Private),
  };
}

export function createX25519PublicKeyFromEd25519PublicKey(
  publicKey: Ed25519PublicKey
) {
  return new X25519PublicKey(convertPublicKeyToX25519(publicKey.raw));
}
