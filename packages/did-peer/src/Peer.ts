import {
  Curve,
  DID,
  DIDUrl,
  ExportFormats,
  PublicKey,
} from "@djack-sdk/interfaces";

import { Buffer } from "buffer/index.js";

import type { Service, DIDDoc } from "didcomm-node";
import { base58btc } from "multiformats/bases/base58";
import { base64url } from "multiformats/bases/base64";
import {
  KeyType,
  Numalgo2Prefix,
  MultiCodec,
  Codec,
} from "./helpers/Multicodec";

import { KeyTuples, PeerDIDComposition } from ".";
import { Ed25519PublicKey } from "./ed25519/PublicKey";
import { X25519PublicKey } from "./x25519/PublicKey";

export class PeerDID extends DID {
  public static readonly PeerDIDAlgo = 2;

  public static readonly DIDCommMessagingKey = "DIDCommMessaging";

  public static readonly DIDCommMessagingEncodedKey = "dm";

  constructor(publicKeys: PublicKey[], services: Service[] = []) {
    const keys: KeyTuples = publicKeys.reduce(
      ([signing, encrypting]: KeyTuples, publicKey) =>
        publicKey.curve === Curve.ED25519
          ? [[...signing, PeerDID.multibaseEncoded(publicKey)], encrypting]
          : publicKey.curve === Curve.X25519
            ? [signing, [...encrypting, PeerDID.multibaseEncoded(publicKey)]]
            : [signing, encrypting],
      [[], []]
    );

    const [encodedSigningKeysStr, encodedEncryptionKeysStr] = keys;
    const encodedServicesStr = PeerDID.encodeServices(services);

    super(
      "did",
      "peer",
      `${PeerDID.PeerDIDAlgo}${encodedEncryptionKeysStr}${encodedSigningKeysStr}${encodedServicesStr}`
    );
  }

  private static validateRawKeyLength(key: Uint8Array) {
    if (key.length !== 32) {
      throw new Error("Invalid key length");
    }
  }

  private static prefixNumAlgo2(keyType: KeyType) {
    const prefix: string | undefined =
      keyType === KeyType.authenticate
        ? Numalgo2Prefix.authentication
        : Numalgo2Prefix.keyAgreement;

    if (!prefix) {
      throw new Error("Invalid Key Type");
    }

    return prefix;
  }

  static multibaseEncoded(publicKey: PublicKey) {
    const publicKeyType: KeyType | undefined =
      publicKey.curve === Curve.ED25519
        ? KeyType.authenticate
        : publicKey.curve === Curve.X25519
          ? KeyType.agreement
          : undefined;

    if (publicKeyType === undefined) {
      throw new Error("Invalid Key Type");
    }

    const decodedKey = base64url.baseDecode(publicKey.encoded);

    this.validateRawKeyLength(decodedKey);

    const multiCodec = new MultiCodec(decodedKey, publicKeyType);
    const base58Encoded = base58btc.encode(multiCodec.value);

    return `.${this.prefixNumAlgo2(publicKeyType)}${base58Encoded}`;
  }

  static encodeServices(services: Service[]) {
    if (services.length) {
      const encodedServices = services.map((service) => ({
        t: service.type.replace(
          PeerDID.DIDCommMessagingKey,
          PeerDID.DIDCommMessagingEncodedKey
        ),
        s: service.serviceEndpoint.uri,
        r: service.serviceEndpoint.routing_keys,
        a: service.serviceEndpoint.accept,
      }));

      if (encodedServices.length <= 1) {
        return `.${Numalgo2Prefix.service}${base64url.baseEncode(
          Buffer.from(JSON.stringify(encodedServices[0]))
        )}`;
      }

      return `.${Numalgo2Prefix.service}${base64url.baseEncode(
        Buffer.from(JSON.stringify(encodedServices))
      )}`;
    }

    return "";
  }

  private static decodeMultibaseEncnum(
    prefix: Numalgo2Prefix,
    multibase: string
  ): [string, Uint8Array] {
    const defaultCodec =
      prefix === Numalgo2Prefix.authentication ? Codec.ed25519 : Codec.x25519;

    const encnum = multibase.slice(1);
    const encnumData = base58btc.decode(multibase);
    const [codec, decodedEncnum] = new MultiCodec(encnumData).decode(
      defaultCodec
    );

    this.validateRawKeyLength(decodedEncnum);

    const publicKey =
      codec === Codec.x25519
        ? new X25519PublicKey(decodedEncnum)
        : new Ed25519PublicKey(decodedEncnum);

    return [encnum, publicKey.export(ExportFormats.JWK)];
  }

  private static reduceDIDMethodId(
    did: DID,
    previous: PeerDIDComposition,
    current: string
  ): PeerDIDComposition {
    const [authentication, keyAgreement, verificationMethod, service] =
      previous;
    const type = current.slice(0, 1);
    const encoded = current.slice(1);

    if (
      type === Numalgo2Prefix.authentication ||
      type === Numalgo2Prefix.keyAgreement
    ) {
      const decoded = this.decodeMultibaseEncnum(type, encoded);
      const jsonObject = JSON.parse(Buffer.from(decoded[1]).toString());
      const didUrl = new DIDUrl(did, [], new Map(), decoded[0]);

      jsonObject.kid = `${did.toString()}#${decoded[0]}`;

      if (type === Numalgo2Prefix.authentication) {
        authentication.push(didUrl.toString());
      } else {
        keyAgreement.push(didUrl.toString());
      }

      verificationMethod.push({
        id: didUrl.toString(),
        type: "JsonWebKey2020",
        controller: did.toString(),
        publicKeyJwk: jsonObject,
      });
    } else if (type === Numalgo2Prefix.service) {
      const decodedServices = base64url.baseDecode(encoded);
      const jsonServices = JSON.parse(Buffer.from(decodedServices).toString());
      const jsonServicesArray = Array.isArray(jsonServices)
        ? jsonServices
        : [jsonServices];

      service.push(
        ...jsonServicesArray.map((currentService, index) => {
          return {
            id: `${did.toString()}#${currentService.type}-${index}`,
            type: currentService.t.replace(
              PeerDID.DIDCommMessagingEncodedKey,
              PeerDID.DIDCommMessagingKey
            ),
            serviceEndpoint: {
              uri: currentService.s,
              accept: currentService.a,
              routing_keys: currentService.r,
            },
          };
        })
      );
    }

    return [authentication, keyAgreement, verificationMethod, service];
  }

  static resolve(did: DID): DIDDoc {
    const composition = did.methodId.split(".").slice(1);
    const reduceDIDMethodId = this.reduceDIDMethodId.bind(this, did);
    const [authentication, keyAgreement, verificationMethod, service] =
      composition.reduce(reduceDIDMethodId, [[], [], [], []]);

    return {
      id: did.toString(),
      keyAgreement,
      authentication,
      verificationMethod,
      service,
    };
  }
}
