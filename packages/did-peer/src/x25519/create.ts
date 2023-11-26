import {
  convertPublicKeyToX25519,
  convertSecretKeyToX25519,
} from "@stablelib/ed25519";

import { Domain, X25519PrivateKey, X25519PublicKey, Ed25519PublicKey } from '@atala/prism-wallet-sdk';

export function createX25519FromEd25519KeyPair(keyPair: Domain.KeyPair): Domain.KeyPair {
  if (
    keyPair.privateKey.curve !== Domain.Curve.ED25519 ||
    keyPair.publicKey.curve !== Domain.Curve.ED25519
  ) {
    throw new Error("Invalid key curve");
  }

  const x25519Private = convertSecretKeyToX25519(keyPair.privateKey.raw);
  const x25519Public = convertPublicKeyToX25519(keyPair.publicKey.raw);

  return {
    curve: Domain.Curve.X25519,
    publicKey: new X25519PublicKey(x25519Public),
    privateKey: new X25519PrivateKey(x25519Private),
  };
}

export function createX25519PublicKeyFromEd25519PublicKey(
  publicKey: Ed25519PublicKey
) {
  return new X25519PublicKey(convertPublicKeyToX25519(publicKey.raw));
}
