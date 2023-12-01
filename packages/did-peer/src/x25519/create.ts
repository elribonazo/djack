import {
  convertPublicKeyToX25519,
  convertSecretKeyToX25519,
} from "@stablelib/ed25519";

import { Domain, Ed25519PublicKey } from '@atala/prism-wallet-sdk';
import { ExportableX25519PrivateKey, ExportableX25519PublicKey } from "@djack-sdk/interfaces";

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
    publicKey: new ExportableX25519PublicKey(x25519Public),
    privateKey: new ExportableX25519PrivateKey(x25519Private),
  };
}

export function createX25519PublicKeyFromEd25519PublicKey(
  publicKey: Ed25519PublicKey
) {
  return new ExportableX25519PublicKey(convertPublicKeyToX25519(publicKey.raw));
}
