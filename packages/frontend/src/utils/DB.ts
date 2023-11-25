/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Ed25519PrivateKey, X25519PrivateKey } from "@djack-sdk/did-peer";
import { AbstractStore, Curve, DID, PrivateKey } from "@djack-sdk/interfaces";
import { PeerId } from "@libp2p/interface-peer-id";
import Dexie from "dexie";

export type dbKey = {
  id?: number;
  did: string;
  peerId: string;
  rawHex: string;
  type: string;
};

export type dbCredential = {
  id?: number;
  did: string;
  account: string;
  domain: string;
  linkSecret?: string;
  offerHex?: string;
  requestMetadataRawHex?: string;
  rawHex?: string;
};

export type dbEmail = {
  id?: number;
  credentialId: number;
  from: string;
  to: string;
  date: string;
  subject: string;
  text: string;
  html: string;
  //TODO
  //attachments: any[];
};

enum TABLES {
  keys = "keys",
  credentials = "credentials",
  emails = "emails",
}

export class DB implements AbstractStore {
  private applied = false;
  private indexedOnly = false;

  constructor(
    name: string,
    private key: Uint8Array,
    private db = new Dexie(name)
  ) {
    console.log("Instance of db");
    this.db.version(10).stores({
      [TABLES.keys]: "++id, did, peerId, rawHex, type",
      [TABLES.credentials]: "++id, [did+account+domain], linkSecret, offerHex, requestMetadataRawHex, rawHex",
      [TABLES.emails]: "++id, credentialId, from, to, date, text, html, subject",
    });
  }

  private async apply() {
    if (!this.applied) {
      const packageEnc = await import("dexie-encrypted");
      const { cryptoOptions: { ENCRYPT_LIST, NON_INDEXED_FIELDS } } = packageEnc;

      const tableOptions = this.indexedOnly ? {
        [TABLES.keys]: NON_INDEXED_FIELDS,
        [TABLES.credentials]: NON_INDEXED_FIELDS,
        [TABLES.emails]: NON_INDEXED_FIELDS,
      } : {
        [TABLES.keys]: {
          type: ENCRYPT_LIST,
          fields: ['rawHex']
        },
        [TABLES.credentials]: {
          type: ENCRYPT_LIST,
          fields: ['linkSecret', 'offerHex', 'requestMetadataRawHex', 'rawHex']
        },
        [TABLES.emails]: {
          type: ENCRYPT_LIST,
          fields: ['from', 'to', 'date', 'text', 'html', 'subject']
        },
      };

      await packageEnc.applyEncryptionMiddleware(
        this.db,
        this.key,
        tableOptions as any,
        () => {
          throw new Error("DATABASE ERROR");
        }
      );

      this.applied = true;
    }
  }

  private get didsTable() {
    return this.db.table<dbKey, number>(TABLES.keys);
  }

  private get credentialsTable() {
    return this.db.table<dbCredential, number>(TABLES.credentials);
  }

  private get emailsTable() {
    return this.db.table<dbEmail, number>(TABLES.emails);
  }

  async start() {
    await this.apply();
    return this.db.open();
  }

  async getAllKeys() {
    await this.apply();
    return this.didsTable.toArray();
  }

  async addEmail(
    credentialId: number,
    from: string,
    to: string,
    date: string,
    subject: string,
    text: string,
    html: string
  ) {
    await this.apply();
    const emailId = await this.emailsTable.add({
      credentialId,
      from,
      to,
      date,
      subject,
      text,
      html,
    });

    const [email] = await this.emailsTable
      .where("id")
      .equals(emailId)
      .toArray();

    return email!;
  }

  async getAllCredentialEmails(credentialId) {
    await this.apply();
    return this.emailsTable
      .where("credentialId")
      .equals(credentialId)
      .toArray();
  }

  async addCredentialOffer(
    did: string,
    account: string,
    domain: string,
    offer: Uint8Array
  ) {
    await this.apply();
    const credential = await this.getCredential(did, account, domain);
    if (credential) {
      return this.credentialsTable.update(credential.id!, {
        ...credential,
        offerHex: Buffer.from(offer).toString("hex"),
      });
    }
    return this.credentialsTable.add({
      did: did,
      account,
      domain,
      offerHex: Buffer.from(offer).toString("hex"),
    });
  }

  async updateCredentialRequest(
    id: number,
    linkSecret: string,
    requestMetadataRawHex: Uint8Array
  ) {
    await this.apply();
    const [existingCredential] = await this.credentialsTable.where("id").equals(id).toArray();
    return this.credentialsTable.update(id, {
      ...existingCredential,
      requestMetadataRawHex: Buffer.from(requestMetadataRawHex).toString("hex"),
      linkSecret,
    })
  }

  async updateCredential(id: number, credential: Uint8Array) {
    await this.apply();
    const [existingCredential] = await this.credentialsTable.where("id").equals(id).toArray();
    return this.credentialsTable.update(id, {
      ...existingCredential,
      rawHex: Buffer.from(credential).toString("hex"),
    })
  }

  async getCredential(
    did: string,
    account: string,
    domain: string
  ): Promise<dbCredential | null> {
    await this.apply();
    const found = await this.credentialsTable
      .where("[did+account+domain]")
      .equals([did, account, domain])
      .toArray();
    if (!found || found.length <= 0) {
      return null;
    }

    const last = found[found.length - 1]!;

    return last;
  }

  async findKeysByDID(search?: {
    did?: string | string[];
    peerId?: string | string[];
  }): Promise<PrivateKey[]> {
    await this.apply();
    const results: dbKey[] = [];
    const searchField = search?.did ? "did" : search?.peerId ? "peerId" : null;
    if (!searchField) {
      results.push(...(await this.getAllKeys()));
    } else {
      const searchValue = search?.did ? search.did : search!.peerId!;
      if (Array.isArray(searchValue)) {
        results.push(
          ...(await this.didsTable.where("did").anyOf(searchValue).toArray())
        );
      } else {
        results.push(
          ...(await this.didsTable.where("did").equals(searchValue).toArray())
        );
      }
    }
    return results.map(this.toKey);
  }

  private toKey(dbKey: dbKey) {
    const raw = Buffer.from(dbKey.rawHex, "hex");
    const type = dbKey.type;
    if (type === Curve.ED25519) {
      return new Ed25519PrivateKey(raw);
    } else if (type === Curve.X25519) {
      return new X25519PrivateKey(raw);
    }
    throw new Error("Not implemented");
  }

  async addDIDKey(did: DID, peerId: PeerId, key: PrivateKey): Promise<void> {
    await this.apply();
    await this.didsTable.add({
      did: did.toString(),
      type: key.curve,
      peerId: peerId.toString(),
      rawHex: Buffer.from(key.raw).toString("hex"),
    });
  }

  async findAllDIDs(): Promise<DID[]> {
    await this.apply();
    return (await this.didsTable.toArray()).map((row) =>
      DID.fromString(row.did)
    );
  }
}
