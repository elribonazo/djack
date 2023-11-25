import Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import { Buffer } from "buffer/index.js";

import { mnemonicToEntropy, generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

import { Ed25519PrivateKey, Ed25519PublicKey } from "@djack-sdk/did-peer";
import { KeyPair } from "@djack-sdk/interfaces";

export default class Crypto {
  static generateMnemonic() {
    return generateMnemonic(wordlist).split(" ");
  }

  static getEntropy(words: string[]) {
    return mnemonicToEntropy(words.join(" "), wordlist);
  }

  static async createEd25519KeyPair(
    entropy: Uint8Array,
    _passphrase = ""
  ): Promise<KeyPair> {
    const prvKey = Cardano.Bip32PrivateKey.from_bip39_entropy(
      entropy,
      Buffer.from(_passphrase)
    );
    const ed25519Prv = prvKey.to_raw_key().as_bytes();
    const ed25519Pub = prvKey.to_raw_key().to_public().as_bytes();

    const ed25519PrivateKey = new Ed25519PrivateKey(ed25519Prv);
    const ed25519PublicKey = new Ed25519PublicKey(ed25519Pub);

    return {
      public: ed25519PublicKey,
      private: ed25519PrivateKey,
    };
  }
}
