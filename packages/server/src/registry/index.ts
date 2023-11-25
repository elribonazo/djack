import {
  Schema,
  CredentialDefinition,
  CredentialDefinitionPrivate,
  KeyCorrectnessProof,
  CredentialOffer,
} from "@hyperledger/anoncreds-nodejs";

const registryData = {
  credentialSchemas: [] as any,
  credentialDefinitions: [] as any,
  credentialOffers: [] as any,
};

export class Registry {
  async fetchCredentialOffer(credentialOfferId: string) {
    const found = registryData.credentialOffers.find((schema: any) => true);
    if (found) {
      return CredentialOffer.fromJson(found.credentialOffer);
    }
    return undefined;
  }
  async fetchCredentialSchemaById(credentialSchemaId: string) {
    const found = registryData.credentialSchemas.find((schema: any) => true);
    if (found) {
      return Schema.fromJson(found.schema);
    }
    return undefined;
  }

  async fetchCredentialDefinitionId(credentialDefinitionId: string) {
    const found = registryData.credentialDefinitions.find(
      (credentialDefinition: any) => true
    );
    const response: {
      credentialDefinition?: CredentialDefinition;
      credentialDefinitionPrivate?: CredentialDefinitionPrivate;
      keyCorrectnessProof?: KeyCorrectnessProof;
    } = {};
    if (found) {
      if (found.credentialDefinition) {
        response.credentialDefinition = CredentialDefinition.fromJson(
          found.credentialDefinition
        );
      }
      if (found.credentialDefinitionPrivate) {
        response.credentialDefinitionPrivate =
          CredentialDefinitionPrivate.fromJson(
            found.credentialDefinitionPrivate
          );
      }
      if (found.keyCorrectnessProof) {
        response.keyCorrectnessProof = KeyCorrectnessProof.fromJson(
          found.keyCorrectnessProof
        );
      }
      return response;
    }
    return undefined;
  }

  async addCredentialSchema(id: string, schema: any) {
    registryData.credentialSchemas.push({
      id,
      schema: schema,
    });
  }

  async addCredentialDefinition(id: string, definition: any) {
    registryData.credentialDefinitions.push({
      id,
      ...definition,
    });
  }

  async addCredentialOffer(id: string, offer: CredentialOffer) {
    registryData.credentialOffers.push({
      id,
      credentialOffer: offer.toJson(),
    });
  }
}

export const registry = new Registry();
