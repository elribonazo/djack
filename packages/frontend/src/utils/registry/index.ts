/* eslint-disable @typescript-eslint/no-unused-vars */
const registryData = {
  credentialSchemas: [] as any,
  credentialDefinitions: [] as any,
};

export class Registry {
  async fetchCredentialSchemaById(_credentialSchemaId: string) {
    return undefined;
  }

  async fetchCredentialDefinitionId(_credentialDefinitionId: string) {
    return undefined;
  }

  async addCredentialSchema(id: string, schema: any) {
    registryData.credentialSchemas.push({
      id: id,
      schema: schema.toJson(),
    });
  }

  async addCredentialDefinition(id: string, definition: any) {
    registryData.credentialDefinitions.push({
      id: id,
      credentialDefinition: definition.credentialDefinition.toJson(),
      credentialDefinitionPrivate:
        definition.credentialDefinitionPrivate.toJson(),
      keyCorrectnessProof: definition.keyCorrectnessProof.toJson(),
    });
  }
}

export const registry = new Registry();
