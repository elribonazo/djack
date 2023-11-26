import { CredentialIssueMessage, Network } from "@djack-sdk/network";
import {
  CredentialOffer,
  Credential,
  CredentialRequest,
  LinkSecret,
} from "@hyperledger/anoncreds-nodejs";
import { IncomingStreamData } from "@libp2p/interface/stream-handler";
import { pipe } from "it-pipe";
import { Domain } from '@atala/prism-wallet-sdk';

import { AccountArray } from "../account";

async function credentialIssueHandle(
  data: IncomingStreamData,
  network: Network,
  accounts: AccountArray
) {
  const { stream, connection } = data;

  await pipe(stream, async (source) => {
    for await (const msg of source) {
      //TODO VALIDATE MESSAGES
      const message = await network.unpack(msg.subarray());

      const body = message.as_value().body;
      const offer = CredentialOffer.fromJson(body.offer);
      const request = CredentialRequest.fromJson(body.request);
      const email = body.email;
      const cardanoDID = body.did;

      console.log(
        `[${email}] Has sent a credential request with did ${cardanoDID}`
      );

      const { credentialDefinition, credentialDefinitionPrivate } =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (await network.registry.fetchCredentialDefinitionId(
          body.offer.cred_def_id
        ))!;

      console.log(
        `[${email}] Issuing credential for ${email} and ${cardanoDID}`
      );

      const issuedCredential = Credential.create({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        credentialDefinition: credentialDefinition!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        credentialDefinitionPrivate: credentialDefinitionPrivate!,
        credentialOffer: offer,
        credentialRequest: request,
        attributeRawValues: {
          email: email,
          did: cardanoDID,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const fromIssueIssue = message.as_value().to![0];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const toIssueHolder = message.as_value().from!;

      accounts.push([
        Domain.DID.fromString(cardanoDID),
        Domain.DID.fromString(toIssueHolder),
        body.email,
        body.offer.cred_def_id,
        body.offer.schema_id,
        connection.remotePeer.toString(),
      ]);

      const issueCredentialMessage = await CredentialIssueMessage.fromJSON({
        id: LinkSecret.create(),
        from: fromIssueIssue,
        to: [toIssueHolder],
        body: issuedCredential.toJson(),
      });

      const encryptedOffer = await network.packMessage(
        fromIssueIssue,
        toIssueHolder,
        issueCredentialMessage.message
      );

      console.log(`[${email}] Sending the issued credential`);
      await pipe([encryptedOffer], stream);

      // if (process.env?.NODE_ENV === "development") {
      //   console.log(`[${email}] Attempting to deliver an email`);
      //   new CancellableTask(
      //     async () => {
      //       const send = new Email({
      //         serverName: "djack.email",
      //         hostname: "localhost",
      //         port: 587,
      //       });

      //       await send.send({
      //         from: "elribonazo@gmail.com",
      //         to: process.env.TEST_EMAIL!,
      //         subject: "test",
      //         text: "text",
      //       });
      //     },
      //     {
      //       abort: new AbortController(),
      //       repeatEvery: REPEAT_EMAIL_EVERY_MS,
      //     }
      //   )
      //     .then()
      //     .then(() => {
      //       console.log(`[${email}] The email was delivered`);
      //     })
      //     .catch((err) => {
      //       if (err instanceof Error) {
      //         if (err.message !== "Task was cancelled")
      //           console.log("Error delivering email", err);
      //       } else {
      //         console.log("Error delivering email");
      //       }
      //     });
      // }
    }
  });

  await stream.close();
}

export function createCredentialIssueHandler(
  network: Network,
  accounts: AccountArray
) {
  return (data: IncomingStreamData) =>
    credentialIssueHandle(data, network, accounts);
}
