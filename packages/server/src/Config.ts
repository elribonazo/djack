import crypto from "./crypto/index.js";

const issuerWords = [
  "angle",
  "host",
  "siren",
  "spare",
  "naive",
  "absorb",
  "add",
  "sunset",
  "reopen",
  "afraid",
  "pepper",
  "injury",
  "heavy",
  "deposit",
  "knock",
  "valve",
  "film",
  "good",
  "display",
  "race",
  "merge",
  "summer",
  "photo",
  "raven",
];

export const AUTH_HEADER_NAME = "auth-proof";

const holderWords = [
  "into",
  "try",
  "aunt",
  "arch",
  "easy",
  "company",
  "rule",
  "repeat",
  "kit",
  "clap",
  "essence",
  "file",
];
export const holderEntropy = crypto.getEntropy(holderWords);
export const issuerEntropy = crypto.getEntropy(issuerWords);

export const issuerDID =
  "did:peer:2.Ez6LSdd9hcZ8B7pQzM2BCL6V55NpgzjwQX7eQCKUapbt5rvTk.Vz6MkwUdKCGNkubJEMx3oGpH2NRA62Ku8L1Siw52zYT4fhbM3.SeyJ0IjoiZG0iLCJzIjoiMTJEM0tvb1dTcWpTTTlpMmt4NUZmTGlYRHI0WEo3Z3ZoNWZ1d3BHckNlVjY2QUZZZ0tIYiIsImEiOlsiZGlkY29tbS92MiJdfQ";
export const holderDID =
  "did:peer:2.Ez6LSfg3q9NYaGBVwBhhNUUNUCKMCbbFuD4VELB1ZUxngQDXZ.Vz6MkixxcSiDqgy5vZhutCuowmEv6kgu6RLhhDDWVCXLUqmZs.SeyJ0IjoiZG0iLCJzIjoiaHR0cHM6Ly9leGFtcGxlLmNvbS9lbmRwb2ludCIsInIiOlsiZGlkOmV4YW1wbGU6c29tZW1lZGlhdG9yI3NvbWVrZXkiXSwiYSI6W119";

export const relays = [
  "/dns4/panama.djack.email/tcp/443/wss/p2p-webrtc-star",
  "/dns4/barcelona.djack.email/tcp/443/wss/p2p-webrtc-star",
];

export const DEFAULT_MAIL_PORT = 465;
export const DEFAULT_HTTP_PORT = process.env.HTTP_PORT || 443;
export const DEFAULT_PUBLIC_DOMAIN =
  process.env.PUBLIC_DOMAIN || "https://djack.email";

export const DEFAULT_DIDWEB_HOST =
  process.env.PUBLIC_DIDWEB_HOST || "djack.email";

export const REPEAT_EMAIL_EVERY_MS = 100000;
