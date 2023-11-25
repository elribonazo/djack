import { ExchangeDeliveryMessage, Network } from "@djack-sdk/network";
import { simpleParser } from "mailparser";
import { SMTPServerDataStream, SMTPServerSession } from "smtp-server";
import { PROTOCOLS } from "@djack-sdk/interfaces";
import { LinkSecret } from "@hyperledger/anoncreds-nodejs";
import { peerIdFromString } from "@libp2p/peer-id";
import { AKEY } from "../types";
import { AccountArray } from "../server/account";

async function onData(
  stream: SMTPServerDataStream,
  session: SMTPServerSession,
  accounts: AccountArray,
  network: Network
) {
  return new Promise<void>((resolve, reject) => {
    simpleParser(stream, {}, async (err, mail) => {
      try {
        if (err) {
          console.error("Error parsing email:", err);
          return reject(err);
        }
        const peers = accounts.filter((account) => {
          if (Array.isArray(mail.to)) {
            return mail.to.find(({ value }) =>
              value.find(({ address }) => address === account[2])
            );
          } else {
            return mail.to?.value.find(({ address }) => address === account[2]);
          }
        });
        if (!peers.length) {
          throw new Error("No peers to deliver the email, rejecting.");
        }
        for (const [index, peer] of peers.entries()) {
          try {
            const issuer = network.peerdid.toString();
            const holder = peer[AKEY.PEERDID].toString();
            const emailMessage = await ExchangeDeliveryMessage.fromJSON({
              thid: LinkSecret.create(),
              from: issuer,
              to: [holder],
              body: mail,
            });
            const encryptedEmail = await network.packMessage(
              issuer,
              holder,
              emailMessage.message
            );
            const peerId = peerIdFromString(peer[AKEY.PEERID]);
            await network.sendMessage(
              peerId,
              network.getServiceProtocol(PROTOCOLS.emailExchangeDelivery),
              encryptedEmail
            );
          } catch (err) {
            accounts.splice(index, 1);
            console.log("Failed to deliver email", err);
          }
        }
        return resolve();
      } catch (err) {
        if (err instanceof Error) {
          return reject(err);
        }
      }
    });
  });
}

export function createOnData(accounts: AccountArray, network: Network) {
  return (
    stream: SMTPServerDataStream,
    session: SMTPServerSession,
    callback: (err?: Error | null | undefined) => void
  ) => {
    onData(stream, session, accounts, network)
      .then(() => {
        return callback();
      })
      .catch((err) => {
        return callback(err as Error);
      });
    return callback();
  };
}
