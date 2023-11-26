import { Domain, Apollo } from '@atala/prism-wallet-sdk';

const apollo = new Apollo();

export function createEd25519KeyPair(): Domain.KeyPair {
  const privateKey = apollo.createPrivateKey({
    type: Domain.KeyTypes.EC,
    curve: Domain.Curve.ED25519,
  });
  return {
    curve: Domain.Curve.ED25519,
    privateKey: privateKey,
    publicKey: privateKey.publicKey(),
  };
}
