import { AbstractStore } from "@djack-sdk/interfaces";
import { type PeerId } from "@libp2p/interface-peer-id";
import { Domain } from '@atala/prism-wallet-sdk';

const data: { keys: { did: Domain.DID; peerId: PeerId; key: Domain.PrivateKey }[] } = {
  keys: [],
};

class InMemory implements AbstractStore {
  async findKeysByDID(search: {
    did?: string | string[] | undefined;
    peerId?: string | string[] | undefined;
  }): Promise<Domain.PrivateKey[]> {
    const keys = data.keys
      .filter((key) => {
        if (!search || (!search.did && !search.peerId)) {
          return true;
        }
        if (search.did) {
          if (Array.isArray(search.did)) {
            return search.did.find((did) => did === key.did.toString());
          }
          return key.did.toString() === search.did;
        }
        if (search.peerId) {
          if (Array.isArray(search.peerId)) {
            return search.peerId.find(
              (peerId) => peerId.toString() === key.peerId.toString()
            );
          }
          return key.peerId.toString() === search.peerId;
        }
      })
      .map((record) => record.key);
    return keys;
  }
  async findAllDIDs(): Promise<Domain.DID[]> {
    const keys = data.keys.map((record) => record.did);
    return keys;
  }
  async addDIDKey(did: Domain.DID, peerId: PeerId, key: Domain.PrivateKey): Promise<void> {
    data.keys.push({
      did,
      key,
      peerId,
    });
  }
}

export const inMemory = new InMemory();
