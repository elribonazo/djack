import type { Service } from "didcomm-node";
import { peerIdFromKeys } from "@libp2p/peer-id";

import { supportedKeys } from "@libp2p/crypto/keys";

import {
  DIDFactoryAbstract,
  StorageInterface,
} from "@djack-sdk/interfaces";

import { Domain, Ed25519PrivateKey, Ed25519PublicKey } from '@atala/prism-wallet-sdk';

import { createX25519FromEd25519KeyPair } from "./x25519/create";

export class DIDFactory implements DIDFactoryAbstract {
  constructor(public storage: StorageInterface) { }

  async createPeerDID(services: Service[] = []) {
    const edPrivate = await supportedKeys.ed25519.generateKeyPair();

    const edKeyPair: Domain.KeyPair = {
      curve: Domain.Curve.ED25519,
      privateKey: new Ed25519PrivateKey(edPrivate.marshal()),
      publicKey: new Ed25519PublicKey(edPrivate.public.marshal()),
    };

    const xKeyPair: Domain.KeyPair = createX25519FromEd25519KeyPair(edKeyPair);
    const keyPairs = [edKeyPair, xKeyPair];

    const publicKeys = keyPairs.map((keyPair) => keyPair.publicKey);
    const privateKeys = keyPairs.map((keyPair) => keyPair.privateKey);
    const did = PeerDIDCreate.createPeerDID(publicKeys, services);

    const peerId = await peerIdFromKeys(
      new supportedKeys.ed25519.Ed25519PublicKey(edKeyPair.publicKey.raw).bytes,
      new supportedKeys.ed25519.Ed25519PrivateKey(
        edKeyPair.privateKey.raw,
        edKeyPair.publicKey.raw
      ).bytes
    );

    for (const priv of privateKeys) {
      await this.storage.store.addDIDKey(did, peerId, priv);
    }

    return did;
  }

  async createPeerDIDWithKeys(keyPairs: Domain.KeyPair[], services: Service[] = []) {
    const publicKeys = keyPairs.map((keyPair) => keyPair.publicKey);
    const privateKeys = keyPairs.map((keyPair) => keyPair.privateKey);
    const did = PeerDIDCreate.createPeerDID(publicKeys, services);

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
