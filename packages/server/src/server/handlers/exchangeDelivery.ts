import { AccountArray } from "../account";
import { IncomingStreamData } from "@libp2p/interface/stream-handler";
import { registry } from "../../registry";
import {
  LinkSecret,
  Presentation,
  PresentationRequest,
} from "@hyperledger/anoncreds-nodejs";
import { pipe } from "it-pipe";
import {
  CancellableTask,
  ExchangeRequestPresentationMessage,
  Network,
} from "@djack-sdk/network";
import { DID, PROTOCOLS, toDIDCOMMType } from "@djack-sdk/interfaces";
import { REPEAT_EMAIL_EVERY_MS } from "../../Config";
import Email from "../../email";

async function exchangeDelivery(
  data: IncomingStreamData,
  network: Network,
  accounts: AccountArray
) {
  const { stream, connection } = data;
  await pipe(stream, async (source) => {
    for await (const msg of source) {
      const message = await network.unpack(msg.subarray());
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const issuer = message.as_value().to![0];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const holder = message.as_value().from!;
      const body = message.as_value().body;
      const type = message.as_value().type;
      const email = body.email;
      const cardanoDID = body.did;

      if (type === toDIDCOMMType(PROTOCOLS.emailExchangeAuthenticate)) {
        const credentialDefinitionId = `${issuer}/definitions/djack`;
        const credentialSchemaId = `${issuer}/schemas/djack`;
        const credentialSchema = await registry.fetchCredentialSchemaById(
          credentialSchemaId
        );
        const credentialDefinition = await registry.fetchCredentialDefinitionId(
          credentialDefinitionId
        );

        const presentationJson = {
          name: LinkSecret.create(),
          version: "1.0",
          nonce: LinkSecret.create(),
          requested_attributes: {
            email: {
              name: "email",
              names: ["email", "Email", "Email Address"],
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                  "attr::email::value": email,
                },
              ],
            },
            did: {
              name: "did",
              names: ["did", "DID"],
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                  "attr::did::value": cardanoDID,
                },
              ],
            },
          },
        };

        const presentationRequest =
          PresentationRequest.fromJson(presentationJson);

        const presentationRequestMessage =
          await ExchangeRequestPresentationMessage.fromJSON({
            thid: message.as_value().thid,
            from: issuer,
            to: [holder],
            body: presentationJson,
          });

        const encryptedPresentationRequest = await network.packMessage(
          issuer,
          holder,
          presentationRequestMessage.message
        );

        let valid = false;
        try {
          const peer = connection.remotePeer;
          const presentationMessage = await network.sendAndGetResponse(
            peer,
            network.getServiceProtocol(PROTOCOLS.emailExchangeDelivery),
            encryptedPresentationRequest
          );
          const presentation = Presentation.fromJson(
            presentationMessage.as_value().body
          );
          valid = presentation.verify({
            presentationRequest: presentationRequest,
            schemas: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              [credentialSchemaId]: credentialSchema!,
            },
            credentialDefinitions: {
              [credentialDefinitionId]:
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
                credentialDefinition?.credentialDefinition!,
            },
          });
        } catch (err) {
          console.log("Failed with err", err);
        }
        if (valid) {
          accounts.push([
            DID.fromString(cardanoDID),
            DID.fromString(holder),
            email,
            credentialDefinitionId,
            credentialSchemaId,
            connection.remotePeer.toString(),
          ]);
          if (process.env?.NODE_ENV === "development") {
            new CancellableTask(
              async () => {
                const send = new Email({
                  serverName: "djack.email",
                  hostname: "localhost",
                  port: 587,
                });

                await send.send({
                  from: "elribonazo@gmail.com",
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  to: process.env.TEST_EMAIL!,
                  subject: "test",
                  text: "text",
                });
              },
              {
                abort: new AbortController(),
                repeatEvery: REPEAT_EMAIL_EVERY_MS,
              }
            )
              .then()
              .then(() => {
                console.log(`[${email}] The email was delivered`);
              })
              .catch((err) => {
                if (err instanceof Error) {
                  if (err.message !== "Task was cancelled")
                    console.log("Error delivering email", err);
                } else {
                  console.log("Error delivering email");
                }
              });
          }
        }
      }
    }
  });
  await stream.close();
}

export function createExchangeDelivery(
  network: Network,
  accounts: AccountArray
) {
  return (data: IncomingStreamData) =>
    exchangeDelivery(data, network, accounts);
}
