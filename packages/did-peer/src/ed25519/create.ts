import { KeyPair } from "@djack-sdk/interfaces";
import { generateKeyPair } from "@stablelib/ed25519";
import { Ed25519PrivateKey } from "./PrivateKey";
import { Ed25519PublicKey } from "./PublicKey";

export function createEd25519KeyPair(): KeyPair {
  const keyPair = generateKeyPair();
  return {
    private: new Ed25519PrivateKey(keyPair.secretKey),
    public: new Ed25519PublicKey(keyPair.publicKey),
  };
}
