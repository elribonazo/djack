import { CredentialOfferRequestMessage, Network } from "@djack-sdk/network";
import { CredentialOffer } from "@hyperledger/anoncreds-nodejs";
import { IncomingStreamData } from "@libp2p/interface/stream-handler";
import { pipe } from "it-pipe";
import { PROTOCOLS } from "@djack-sdk/interfaces";

import { credentialDefinitionResolver } from "../resolver";

async function credentialOfferHandle(
  data: IncomingStreamData,
  network: Network
) {
  const { stream, connection } = data;
  const schemaId = `${network.peerdid}/schemas/djack`;
  const credentialDefinitionId = `${network.peerdid}/definitions/djack`;
  const credentialDefinition = await credentialDefinitionResolver(
    "/djack",
    network
  );
  if (!credentialDefinition) {
    throw new Error("Invalid credential definition.");
  }

  await pipe(stream, async (source) => {
    for await (const msg of source) {
      const message = await network.unpack(msg.subarray());

      const offerRequestMessage = await CredentialOfferRequestMessage.fromJSON(
        message.as_value()
      );

      const credentialOffer = CredentialOffer.create({
        schemaId: schemaId,
        credentialDefinitionId: credentialDefinitionId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
        keyCorrectnessProof: credentialDefinition?.keyCorrectnessProof!,
      });

      const fromOfferIssuer = network.peerdid.toString();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const toOfferHolder = message.as_value().from!;

      const offerMessage = offerRequestMessage.respond({
        from: fromOfferIssuer,
        to: [toOfferHolder],
        body: credentialOffer.toJson(),
      });

      const encryptedOffer = await network.packMessage(
        fromOfferIssuer,
        toOfferHolder,
        offerMessage.message
      );

      await network.sendMessage(
        connection.remoteAddr,
        network.getServiceProtocol(PROTOCOLS.credentialOffer),
        encryptedOffer
      );
    }
  });

  await stream.close();
}

export function createCredentialOfferHandler(network: Network) {
  return (data: IncomingStreamData) => credentialOfferHandle(data, network);
}
