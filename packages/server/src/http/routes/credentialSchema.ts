import { Request, Response } from "express";
import { registry } from "../../registry";

async function credentialSchema(request: Request, response: Response) {
  const credentialSchemaJson = await registry.fetchCredentialSchemaById(
    request.params.schemaId
  );
  return response.json({
    credentialSchema: credentialSchemaJson?.toJson(),
  });
}

export function createCredentialSchemaRoute() {
  return (request: Request, response: Response) =>
    credentialSchema(request, response);
}
