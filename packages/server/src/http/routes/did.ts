import { ExportFormats, Curve, StorageInterface } from "@djack-sdk/interfaces";
import { Service } from "didcomm-node";
import { Request, Response } from "express";
import { DEFAULT_PUBLIC_DOMAIN } from "../../Config";

async function did(
  request: Request,
  response: Response,
  storage: StorageInterface,
  domain: string
) {
  const { peerId } = request.params;
  const records = await storage.store.findKeysByDID({ peerId });
  const domainDID = `did:web:${domain}:peers:${peerId}`;
  if (records.length <= 0) {
    return response.status(404).json({ success: false });
  }
  const authentication: string[] = [];
  const keyAgreement: string[] = [];
  const assertionMethod: string[] = [];
  const verificationMethods: any[] = [];
  records.forEach((record, index) => {
    const JWK = record.export(ExportFormats.JWK);
    if (record.type === Curve.ED25519) {
      authentication.push(`${domainDID}#key-${index}`);
      assertionMethod.push(`${domainDID}#key-${index}`);
    } else if (record.type === Curve.X25519) {
      keyAgreement.push(`${domainDID}#key-${index}`);
    }
    verificationMethods.push({
      id: `${domainDID}#key-${index}`,
      type: "JsonWebKey2020",
      controller: domainDID,
      publicKeyJwk: JSON.parse(Buffer.from(JWK).toString()),
    });
  });
  const services: Service[] = [
    {
      id: "credentialSchemas",
      type: "staticJson",
      serviceEndpoint: {
        uri: `${DEFAULT_PUBLIC_DOMAIN}/peers/${peerId}/schemas`,
      },
    },
    {
      id: "credentialDefinitions",
      type: "staticJson",
      serviceEndpoint: {
        uri: `${DEFAULT_PUBLIC_DOMAIN}/peers/${peerId}/definitions`,
      },
    },
  ];
  return response.json({
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: domainDID,
    verificationMethod: verificationMethods,
    authentication: authentication,
    assertionMethod: assertionMethod,
    keyAgreement: assertionMethod,
    service: services,
  });
}

export function createDIDRoute(storage: StorageInterface, domain: string) {
  return (request: Request, response: Response) =>
    did(request, response, storage, domain);
}
