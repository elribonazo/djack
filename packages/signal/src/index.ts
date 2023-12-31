import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { mplex } from "@libp2p/mplex";
import { webSockets } from "@libp2p/websockets";
import { createLibp2p } from "libp2p";
import { type PeerId } from "@libp2p/interface/peer-id";
import {
  circuitRelayTransport,
  circuitRelayServer,
} from "libp2p/circuit-relay";
import { identifyService } from "libp2p/identify";
import * as filters from "@libp2p/websockets/filters";
import { supportedKeys } from "@libp2p/crypto/keys";
import { peerIdFromKeys } from "@libp2p/peer-id";
import { inMemory } from "@djack-sdk/shared";
import { createEd25519KeyPair, createX25519FromEd25519KeyPair } from "@djack-sdk/did-peer";
import { Service } from "didcomm-node";
import { Domain, Castor, Apollo } from '@atala/prism-wallet-sdk';
import { AbstractExportingKey, ExportFormats, ExportableEd25519PrivateKey, ExportableEd25519PublicKey } from "@djack-sdk/interfaces";

// TODO find out which of this services is causing the CPU to go up
// import { kadDHT } from "@libp2p/kad-dht";
// import { autoNATService } from "libp2p/autonat";
// import { dcutrService } from "libp2p/dcutr";
// import { gossipsub } from "@chainsafe/libp2p-gossipsub";
// import { pingService } from "libp2p/ping";
// import { ipnsSelector } from "ipns/selector";
// import { ipnsValidator } from "ipns/validator";

import HTTP from "./http.js";

const signalingPort = parseInt(`${process.env.PORT || 8080}`);
const signalingHost = process.env.HOST || "0.0.0.0";
const domain = process.env.PUBLIC_DOMAIN || 'localhost';

function getStartupKeys() {
  const pk = process.env.pk;
  const pu = process.env.pu;
  if (pk && pu) {
    return { pk, pu }
  }
  const ed25519KeyPair = createEd25519KeyPair();
  return {
    pk: Buffer.from(ed25519KeyPair.privateKey.raw).toString('hex'),
    pu: Buffer.from(ed25519KeyPair.publicKey.raw).toString('hex')
  }
}

const { pk, pu } = getStartupKeys();
const announce = process.env.announce;

if (!pk || !pu || !announce) {
  throw new Error("Undefined settings");
}

const createHttpForPeerId = (
  peerId: PeerId,
  peerDID: Domain.DID,
  didWeb: string,
  listen: string,
  announce: string,
  pk: string,
  pu: string
) =>
  HTTP.create({
    routes: [
      {
        method: "get",
        url: "/.well-known/did.json",
        route: async (request, response) => {
          const privateKeyRecords = await inMemory.findKeysByDID({ peerId: peerId.toString() });
          //TODO: Remove this code when prism sdk releases this
          const records = privateKeyRecords.filter((record) => (record as unknown as AbstractExportingKey).canExport()) as unknown as AbstractExportingKey[]
          if (records.length <= 0) {
            return response.status(404).json({ success: false });
          }

          const authentication: string[] = [];
          const keyAgreement: string[] = [];
          const assertionMethod: string[] = [];
          const verificationMethods: any[] = [];
          const domainDID = `did:web:${domain}`;
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
          //Better build and expose the services
          const services: Service[] = [
            {
              id: "didcomm",
              type: "DIDCommMessaging",
              serviceEndpoint: {
                uri: peerDID.toString(),
                accept: ["didcomm/v2"],
              },
            }
          ];
          return response.json({
            "@context": [
              "https://www.w3.org/ns/did/v1",
              "https://w3id.org/security/suites/jws-2020/v1",
            ],
            id: domainDID,
            verificationMethod: verificationMethods,
            authentication: authentication,
            assertionMethod: assertionMethod,
            keyAgreement: keyAgreement,
            service: services,
          });

        },
      },
      {
        method: "get",
        url: "*",
        route: async (request, response) => {

          return response.send(`<!DOCTYPE html>
          <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>DJACK BETA Link</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.15/dist/tailwind.min.css" rel="stylesheet">
            </head>
            <body class="bg-gray-900 flex justify-center items-center h-screen ">
                <div >
                <a href="/" class="text-indigo-400 hover:no-underline font-bold text-4xl">
                    @
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">
                        DJACK BETA
                    </span>
                </a>
                <h1 class="text-sm bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">I am a Circuit Relay Server on top of LIBP2P and IPFS</h1>
                <h2 class="text-sm bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">I provide ways to establish decentralised connections between parties.</h2>
                <p class="text-xs bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">Connect to this peer by using this DID:<br />${didWeb}</p> 
                </div>
            </body>
          </html>`);


        },
      },
    ],
  });

const ed25519KeyPair: Domain.KeyPair = {
  curve: Domain.Curve.ED25519,
  privateKey: new ExportableEd25519PrivateKey(Buffer.from(pk, "hex")),
  publicKey: new ExportableEd25519PublicKey(Buffer.from(pu, "hex")),
};

const x25519KeyPair = createX25519FromEd25519KeyPair(ed25519KeyPair);


const peerId = await peerIdFromKeys(
  new supportedKeys.ed25519.Ed25519PublicKey(ed25519KeyPair.publicKey.raw).bytes,
  new supportedKeys.ed25519.Ed25519PrivateKey(
    ed25519KeyPair.privateKey.raw,
    ed25519KeyPair.publicKey.raw
  ).bytes
);

const apollo = new Apollo();
const castor = new Castor(apollo);

const service = new Domain.Service(
  "didcomm",
  ["DIDCommMessaging"],
  {
    uri: announce,
    accept: ["didcomm/v2"],
    routingKeys: []
  }
);

const peerDID = await castor.createPeerDID(
  [ed25519KeyPair, x25519KeyPair].map((keyPair) => keyPair.publicKey),
  [service]
)

await inMemory.addDIDKey(peerDID, peerId, ed25519KeyPair.privateKey);
await inMemory.addDIDKey(peerDID, peerId, x25519KeyPair.privateKey);

console.log("DJACK-signaling");

const filter =
  process.env.FILTER && process.env.FILTER === "dns"
    ? filters.dnsWss
    : filters.all;

const listenAddress = `/ip4/${signalingHost}/tcp/${signalingPort}/ws`;
const didweb = `did:web:${domain}`;
console.log("Starting with ", { pk, pu, peerId, peerDID, announce, listenAddress })

const http = createHttpForPeerId(peerId, peerDID, didweb, listenAddress, announce, pk, pu);
const websockets = webSockets({
  websocket: http.websocket._opts,
  server: http.server,
  filter: filter,
});

const relayNode = await createLibp2p({
  peerId,
  addresses: {
    listen: [listenAddress],
    announce: [announce],
  },
  transports: [websockets, circuitRelayTransport()],
  connectionEncryption: [noise()],
  streamMuxers: [yamux(), mplex()],
  services: {
    identify: identifyService(),
    //TODO find out which of this services is causing the CPU to go up
    // autoNAT: autoNATService(),
    // pubsub: gossipsub(),
    // dcutr: dcutrService(),
    // dht: kadDHT({
    //   validators: { ipns: ipnsValidator },
    //   selectors: { ipns: ipnsSelector },
    // }),
    //ping: pingService(),
    relay: circuitRelayServer({
      advertise: true,
      reservations: {
        maxReservations: Infinity,
        reservationClearInterval: 3600 * 1000,
        applyDefaultLimit: false,
      },
    }),
  },
});

console.log(
  `Started signal server ${signalingHost}:${signalingPort} ${relayNode.peerId.toString()}`
);

console.log("Listening on:");
relayNode.getMultiaddrs().forEach((ma) => console.log(ma.toString()));
