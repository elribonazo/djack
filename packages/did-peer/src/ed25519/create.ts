import { Domain, Apollo } from '@atala/prism-wallet-sdk';
import { ExportableEd25519PrivateKey, ExportableEd25519PublicKey } from '@djack-sdk/interfaces';

const apollo = new Apollo();

export function createEd25519KeyPair(): Domain.KeyPair {
  const privateKey = apollo.createPrivateKey({
    type: Domain.KeyTypes.EC,
    curve: Domain.Curve.ED25519,
  });
  return {
    curve: Domain.Curve.ED25519,
    privateKey: new ExportableEd25519PrivateKey(privateKey.raw),
    publicKey: new ExportableEd25519PublicKey(privateKey.publicKey().raw),
  };
}
