import { ExportFormats, AbstractExportingKey } from "@djack-sdk/interfaces";
import { Network } from "@djack-sdk/network";
import { Service } from "didcomm-node";
import { DEFAULT_PUBLIC_DOMAIN } from "../Config";
import axios from "axios";
import https from "https";
import {
  CredentialDefinition,
  KeyCorrectnessProof,
} from "@hyperledger/anoncreds-nodejs";
import { Domain } from '@atala/prism-wallet-sdk';

export async function credentialSchemaResolver(
  schemaId: string,
  network: Network
): Promise<any> {
  const did = network.peerdid;
  const didDocument = await resolveLocalDIDWEB(network, did.toString());
  const credentialDefinitionService = didDocument.services.find(
    ({ id }) => id === "credentialSchemas"
  );
  const credentialSchemasEndpoint = `${credentialDefinitionService?.serviceEndpoint?.uri}${schemaId}.json`;
  const options =
    process.env.NODE_ENV === "development"
      ? {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
      : {};

  const response = await axios.get(credentialSchemasEndpoint, options);
  return response.data;
}

export async function credentialDefinitionResolver(
  definitionId: string,
  network: Network
): Promise<any> {
  const did = network.peerdid;
  const didDocument = await resolveLocalDIDWEB(network, did.toString());
  const credentialDefinitionService = didDocument.services.find(
    ({ id }) => id === "credentialDefinitions"
  );
  const credentialDefinitionEndpoint = `${credentialDefinitionService?.serviceEndpoint?.uri}${definitionId}.json`;
  const options =
    process.env.NODE_ENV === "development"
      ? {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
      : {};

  const response = await axios.get(credentialDefinitionEndpoint, options);
  return {
    credentialDefinition: CredentialDefinition.fromJson(
      response.data.credentialDefinition
    ),
    keyCorrectnessProof: KeyCorrectnessProof.fromJson(
      response.data.keyCorrectnessProof
    ),
  };
}
export async function resolveLocalDIDWEB(network: Network, did: string) {
  const privateKeyRecords = await network.storage.store.findKeysByDID({ did: did });
  const records = privateKeyRecords.filter((record) => (record as unknown as AbstractExportingKey).canExport()) as unknown as AbstractExportingKey[]

  if (records.length <= 0) {
    throw new Error("NOT FOUND");
  }
  const domainDID = `did:web:${network.didWebHostname
    }:peers:${network.p2p.peerId.toString()}`;

  const authentication: string[] = [];
  const keyAgreement: string[] = [];
  const assertionMethod: string[] = [];
  const verificationMethods: any[] = [];

  records.forEach((record, index) => {
    const JWK = record.export(ExportFormats.JWK);
    if (record.type === Domain.KeyTypes.EC) {
      if (record.isCurve(Domain.Curve.ED25519)) {
        authentication.push(`${domainDID}#key-${index}`);
        assertionMethod.push(`${domainDID}#key-${index}`);
        verificationMethods.push({
          id: `${domainDID}#key-${index}`,
          type: "JsonWebKey2020",
          controller: domainDID,
          publicKeyJwk: JSON.parse(Buffer.from(JWK).toString()),
        });
      }
    } else if (record.type === Domain.KeyTypes.Curve25519) {
      if (record.isCurve(Domain.Curve.X25519)) {
        keyAgreement.push(`${domainDID}#key-${index}`);
        verificationMethods.push({
          id: `${domainDID}#key-${index}`,
          type: "JsonWebKey2020",
          controller: domainDID,
          publicKeyJwk: JSON.parse(Buffer.from(JWK).toString()),
        });
      }
    }
  });

  const services: Service[] = [
    {
      id: "credentialSchemas",
      type: "staticJson",
      serviceEndpoint: {
        uri: `${DEFAULT_PUBLIC_DOMAIN}/peers/${network.p2p.peerId.toString()}/schemas`,
      },
    },
    {
      id: "credentialDefinitions",
      type: "staticJson",
      serviceEndpoint: {
        uri: `${DEFAULT_PUBLIC_DOMAIN}/peers/${network.p2p.peerId.toString()}/definitions`,
      },
    },
  ];

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: domainDID,
    verificationMethod: verificationMethods,
    authentication: authentication,
    assertionMethod: assertionMethod,
    keyAgreement: assertionMethod,
    services: services,
  };
}
