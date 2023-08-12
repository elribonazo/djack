import Cardano from '@minswap/cardano-serialization-lib-nodejs'
import { mnemonicToEntropy, generateMnemonic } from '@scure/bip39';
import { wordlist } from "@scure/bip39/wordlists/english";
import { VerificationMaterial, VerificationMaterialAuthentication, VerificationMaterialFormatPeerDID, VerificationMethodTypeAuthentication } from './models/DID.js';
import { base64url } from 'multiformats/bases/base64';
import { MultiCodec, Numalgo2Prefix } from './helpers/Multicodec.js';
import { base58btc } from "multiformats/bases/base58";


export type KeyPair = {
    private: Cardano.Bip32PrivateKey,
    public: Cardano.Bip32PublicKey
}

export type OctetPublicKey = {
    kty: "OKP";
    crv: string;
    x: Uint8Array;
  };

export default class Core {
    static generateMnemonic() {
        return generateMnemonic(wordlist).split(" ")
    }
    static getEntropy(words: string[]) {
        return mnemonicToEntropy(words.join(" "), wordlist)
    }
    static keyPair(entropy: Uint8Array, passphrase = ""): KeyPair {
        const prvKey = Cardano.Bip32PrivateKey.from_bip39_entropy(entropy,Buffer.from(" "));
        const pubKey = prvKey.to_public();
        return {
            public: pubKey,
            private: prvKey
        }
    }
    private static octetPublicKey(keyPair: KeyPair) {
        return {
            crv: "Ed25519",
            kty: "OKP",
            x: base64url.baseEncode(keyPair.public.to_raw_key().as_bytes()),
          };
    }
    private static authenticationFromKeyPair(keyPair: KeyPair): VerificationMaterialAuthentication {
        return new VerificationMaterialAuthentication(
            JSON.stringify(this.octetPublicKey(keyPair)),
            VerificationMethodTypeAuthentication.JSON_WEB_KEY_2020,
            VerificationMaterialFormatPeerDID.JWK
        )
    }
    private static fromJWKAuthentication(
        material: VerificationMaterialAuthentication
    ): Uint8Array {
        const jsonObject = JSON.parse(material.value);
        const crv = jsonObject.crv;
        const xKey = jsonObject.x;
        if (crv !== "Ed25519") {
          throw new Error("Invalid key curve")
        }
        return Uint8Array.from(
          base64url.baseDecode(Buffer.from(xKey).toString())
        );
    }
    private static createMultibaseEncnumbasic(material: VerificationMaterial) {
        const decodedKey = this.fromJWKAuthentication(material)
        const multiCodec = new MultiCodec(decodedKey, MultiCodec.KeyType.authenticate)
        const base58Encoded = base58btc.encode(multiCodec.value)
        return `.${Numalgo2Prefix.authentication}${base58Encoded}`;
    }
    static createDID(keyPair: KeyPair, services: any[] = []): string {
        return `did:key:2${this.createMultibaseEncnumbasic(this.authenticationFromKeyPair(keyPair))}`
    }
}