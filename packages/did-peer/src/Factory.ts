import type { Service } from "didcomm-node";
import { peerIdFromKeys } from "@libp2p/peer-id";

import { supportedKeys } from "@libp2p/crypto/keys";

import {
  KeyPair,
  DIDFactoryAbstract,
  StorageInterface,
} from "@djack-sdk/interfaces";

import { Ed25519PrivateKey } from "./ed25519/PrivateKey";
import { Ed25519PublicKey } from "./ed25519/PublicKey";

import { PeerDID } from "./Peer";
import { createX25519FromEd25519KeyPair } from "./x25519/create";

export class DIDFactory implements DIDFactoryAbstract {
  constructor(public storage: StorageInterface) { }

  async createPeerDID(services: Service[] = []) {
    const edPrivate = await supportedKeys.ed25519.generateKeyPair();

    const edKeyPair: KeyPair = {
      private: new Ed25519PrivateKey(edPrivate.marshal()),
      public: new Ed25519PublicKey(edPrivate.public.marshal()),
    };

    const xKeyPair: KeyPair = createX25519FromEd25519KeyPair(edKeyPair);
    const keyPairs = [edKeyPair, xKeyPair];

    const publicKeys = keyPairs.map((keyPair) => keyPair.public);
    const privateKeys = keyPairs.map((keyPair) => keyPair.private);
    const did = new PeerDID(publicKeys, services);

    const peerId = await peerIdFromKeys(
      new supportedKeys.ed25519.Ed25519PublicKey(edKeyPair.public.raw).bytes,
      new supportedKeys.ed25519.Ed25519PrivateKey(
        edKeyPair.private.raw,
        edKeyPair.public.raw
      ).bytes
    );

    for (const priv of privateKeys) {
      await this.storage.store.addDIDKey(did, peerId, priv);
    }

    return did;
  }

  async createPeerDIDWithKeys(keyPairs: KeyPair[], services: Service[] = []) {
    const publicKeys = keyPairs.map((keyPair) => keyPair.public);
    const privateKeys = keyPairs.map((keyPair) => keyPair.private);
    const did = new PeerDID(publicKeys, services);

    const peerId = await peerIdFromKeys(
      new supportedKeys.ed25519.Ed25519PublicKey(publicKeys[0].raw).bytes,
      new supportedKeys.ed25519.Ed25519PrivateKey(
        privateKeys[0].raw,
        publicKeys[0].raw
      ).bytes
    );

    for (const priv of privateKeys) {
      await this.storage.store.addDIDKey(did, peerId, priv);
    }

    return did;
  }
}
