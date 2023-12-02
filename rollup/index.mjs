import typescript from "rollup-plugin-typescript2";

import cleanup from "rollup-plugin-cleanup";
import ignore from "rollup-plugin-ignore";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import jsccPlugin from "rollup-plugin-jscc";

const externals = [
  "crypto",
  "express",
  "http",
  "@atala/prism-wallet-sdk",
  "@emurgo/cardano-serialization-lib-nodejs",
  "@scure/bip39",
  "@hyperledger/anoncreds-nodejs",
  "@libp2p/websockets",
  "libp2p/ping",
  "@libp2p/pubsub-peer-discovery",
  "@libp2p/bootstrap",
  "@libp2p/kad-dht",
  "@libp2p/bootstrap",
  "libp2p/autonat",
  "libp2p/upnp-nat",
  "@djack-sdk/interfaces",
  "@djack-sdk/did-peer",
  "@djack-sdk/network",
  "@djack-sdk/shared",
  "@djack-sdk/server",
  "@scure/bip39/wordlists/english",
  "multiformats/bases/base58",
  "@stablelib/sha256",
  "Buffer",
  "ws/index.mjs",
  "ws/index.js",
  "ws",
  "@types/ws",
  "multiformats",
  "buffer/index.js",
  "didcomm-node",
  "didcomm",
  "@stablelib/x25519",
  "fs",
  "path",
  "url",
  "libp2p/upnp-nat",
  "mailparser",
  "smtp-server",
  "@stablelib/uuid",
  "@stablelib/ed25519",
  "multiformats/bases/base64",
  "axios",
  "@libp2p/crypto/keys",
  "libp2p",
  "@libp2p/peer-id",
  "@chainsafe/libp2p-gossipsub",
  "it-pipe",
  "@libp2p/webrtc-star",
  "@chainsafe/libp2p-yamux",
  "@libp2p/mplex",
  "@chainsafe/libp2p-noise",
  "@libp2p/websockets",
  "wrtc",
  "libp2p/identify",
  "@libp2p/kad-dht",
  "@libp2p/bootstrap",
  "@libp2p/webtransport",
  "@libp2p/webrtc",
  "libp2p/autonat",
  "libp2p/circuit-relay",
  "libp2p/dcutr",
];

export default function CreateConfig(
  buildPath,
  plugins = [],
  extraInputs = []
) {
  return {
    input: [`src/index.ts`, ...extraInputs],
    output: {
      sourcemap: true,
      dir: buildPath ? `build/${buildPath}` : `build`,
      format: "esm",
      name: "djackp2p",
    },
    plugins: [
      jsccPlugin({ values: { _ANONCREDS: false } }),
      ignore(externals),
      json(),
      typescript({
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            emitDeclarationOnly: false,
          },
        },
      }),
      ...plugins,
      commonjs(),
      cleanup(),
    ],
    external: externals,
  };
}
