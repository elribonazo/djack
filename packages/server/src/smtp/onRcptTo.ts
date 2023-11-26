import {
  ExchangeRequestPresentationMessage,
  Network,
} from "@djack-sdk/network";
import { peerIdFromString } from "@libp2p/peer-id";

import { SMTPServerAddress, SMTPServerSession } from "smtp-server";

import {
  LinkSecret,
  Presentation,
  PresentationRequest,
} from "@hyperledger/anoncreds-nodejs";
import { PROTOCOLS } from "@djack-sdk/interfaces";
import { AKEY } from "../types";
import { Registry } from "../registry";
import { AccountArray } from "../server/account";

async function onRcptTo(
  { address }: SMTPServerAddress,
  session: SMTPServerSession,
  accounts: AccountArray,
  network: Network,
  registry: Registry
) {
  console.log(`[${address}] New email`);
  const validAccounts = accounts.findValidAccounts(address);
  if (!validAccounts.length) {
    console.log(`[${address}] No valid accounts.`);
    return Promise.reject(
      new Error(
        "The email account can't be reached, so this server will reject the email from being delivered."
      )
    );
  }
  console.log(`[${address}] ${validAccounts.length} valid accounts.`);
  for (const [index, validAccount] of validAccounts.entries()) {
    let valid = false;
    const validEmailAddress = validAccount[AKEY.EMAIL];
    const validCredentialDefinitionId =
      validAccount[AKEY.CREDENDITAL_DEFINITION_ID];
    const validSchemaId = validAccount[AKEY.CREDENTIAL_SCHEMA_ID];

    const peer = peerIdFromString(validAccount[AKEY.PEERID]);
    const cardanoDID = validAccount[AKEY.DID].toString();
    const holder = validAccount[AKEY.PEERDID].toString();
    const issuer = network.peerdid.toString();

    const credentialSchema = await registry.fetchCredentialSchemaById(
      validSchemaId
    );
    const credentialDefinition = await registry.fetchCredentialDefinitionId(
      validCredentialDefinitionId
    );
    console.log(`[${address}] Found credential schemas and definitions`);

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
              cred_def_id: validCredentialDefinitionId,
              "attr::email::value": validEmailAddress,
            },
          ],
        },
        did: {
          name: "did",
          names: ["did", "DID"],
          restrictions: [
            {
              cred_def_id: validCredentialDefinitionId,
              "attr::did::value": cardanoDID,
            },
          ],
        },
      },
    };

    const presentationRequest = PresentationRequest.fromJson(presentationJson);

    const presentationRequestMessage =
      await ExchangeRequestPresentationMessage.fromJSON({
        thid: LinkSecret.create(),
        id: LinkSecret.create(),
        from: issuer,
        to: [holder],
        body: presentationJson,
      });

    const encryptedPresentationRequest = await network.packMessage(
      issuer,
      holder,
      presentationRequestMessage.message
    );

    try {
      console.log(
        `[${address}] Sending request presentation to ${peer.toString()}`
      );

      const presentationMessage = await network.sendAndGetResponse(
        peer,
        network.getServiceProtocol(PROTOCOLS.emailExchangeDelivery),
        encryptedPresentationRequest
      );

      console.log(
        `[${address}] Presentation request response from ${peer.toString()}`
      );

      const presentation = Presentation.fromJson(
        presentationMessage.as_value().body
      );
      try {
        valid = presentation.verify({
          presentationRequest: presentationRequest,
          schemas: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            [validSchemaId]: credentialSchema!,
          },
          credentialDefinitions: {
            [validCredentialDefinitionId]:
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
              credentialDefinition?.credentialDefinition!,
          },
        });
      } catch (err) {
        if (!valid) {
          accounts.splice(index, 1);
        }
        console.log("Verification failed");
      }
    } catch (err) {
      console.log("Failed with err", err);
    }
  }

  if (!accounts.length) {
    return Promise.reject(
      new Error("No valid account proofs exist, so we are rejecting the email.")
    );
  }
}

export function createOnRcptTo(
  accounts: AccountArray,
  network: Network,
  registry: Registry
) {
  return (
    address: SMTPServerAddress,
    session: SMTPServerSession,
    callback: (err?: Error | null | undefined) => void
  ) => {
    onRcptTo(address, session, accounts, network, registry)
      .then(() => {
        return callback();
      })
      .catch((err) => {
        return callback(err as Error);
      });
  };
}
