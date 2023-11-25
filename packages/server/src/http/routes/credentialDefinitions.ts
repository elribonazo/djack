import { Request, Response } from "express";
import { registry } from "../../registry";

async function credentialDefinition(request: Request, response: Response) {
  const credentialDefinitionJson = await registry.fetchCredentialDefinitionId(
    request.params.definitionId
  );
  return response.json({
    credentialDefinition:
      credentialDefinitionJson?.credentialDefinition?.toJson(),
    keyCorrectnessProof:
      credentialDefinitionJson?.keyCorrectnessProof?.toJson(),
  });
}

export function createCredentialDefinitionRoute() {
  return (request: Request, response: Response) =>
    credentialDefinition(request, response);
}
