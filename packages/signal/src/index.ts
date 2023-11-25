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

import { Ed25519PrivateKey, Ed25519PublicKey } from "@djack-sdk/did-peer";

//TODO find out which of this services is causing the CPU to go up
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

const pk = process.env.pk;
const pu = process.env.pu;
const announce = process.env.announce;

if (!pk || !pu || !announce) {
  throw new Error("Undefined settings");
}

const createHttpForPeerId = (
  peerId: PeerId,
  listen: string,
  announce: string
) =>
  HTTP.create({
    routes: [
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
                <p class="text-xs bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">Peer: ${peerId.toString()}</p> 
                <p class="text-xs bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">Address: ${announce}</p>            
                </div>
            </body>
          </html>`);
        },
      },
    ],
  });

const ed25519KeyPair = {
  private: new Ed25519PrivateKey(Buffer.from(pk, "hex")),
  public: new Ed25519PublicKey(Buffer.from(pu, "hex")),
};

const peerId = await peerIdFromKeys(
  new supportedKeys.ed25519.Ed25519PublicKey(ed25519KeyPair.public.raw).bytes,
  new supportedKeys.ed25519.Ed25519PrivateKey(
    ed25519KeyPair.private.raw,
    ed25519KeyPair.public.raw
  ).bytes
);

const filter =
  process.env.FILTER && process.env.FILTER === "dns"
    ? filters.dnsWss
    : filters.all;

const listenAddress = `/ip4/${signalingHost}/tcp/${signalingPort}/ws`;

const http = createHttpForPeerId(peerId, listenAddress, announce);
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
