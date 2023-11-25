/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  CredentialIssueMessage,
  CredentialOfferMessage,
  CredentialOfferRequestMessage,
  CredentialRequestMessage,
  ExchangeAuthenticateMessage,
  ExchangePresentationMessage,
  Network,
  getPeerIDDID,
} from "@djack-sdk/network";
import { DIDDocument, Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";
import { pipe } from "it-pipe";
import { DIDFactory } from "@djack-sdk/did-peer";
import { StorageManager } from "@djack-sdk/shared";
import { type PeerId } from "@libp2p/interface/peer-id";
import * as filters from "@libp2p/websockets/filters";
import axios from "axios";
import { Connection } from "@libp2p/interface/connection";
import { RootState, reduxActions } from "../reducers/app";
import { Registry } from "../utils/registry";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pingService } from "libp2p/ping";
import {
  PROTOCOLS,
  CreateNodeOptions,
  PublicKey,
  Curve,
  ExportFormats,
  ExcludeKeys,
  toDIDCOMMType,
} from "@djack-sdk/interfaces";
import { identifyService } from "libp2p/identify";
import { autoNATService } from "libp2p/autonat";

import { multiaddr } from "@multiformats/multiaddr";
import { DB } from "../utils/DB";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { kadDHT } from "@libp2p/kad-dht";
import { dcutrService } from "libp2p/dcutr";
import { createHash } from "crypto";
import { webSockets } from "@libp2p/websockets";
import { create } from "../utils/gc";
import { DID_WEB_DOMAIN, DOMAIN, NEXT_DOMAIN } from "../config";
import type { Message } from "didcomm";
import { MutableParsedMail } from "../utils/types";
import { Anoncreds } from "@djack-sdk/network/build/typings/Anoncreds";
import { circuitRelayTransport } from "libp2p/circuit-relay";
import { bootstrap } from "@libp2p/bootstrap";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";

import { webRTCDirect, webRTC } from "@libp2p/webrtc";

const webResolver = getResolver();
const didResolver = new Resolver(webResolver);
type UINodeOptions<T extends Record<string, unknown>> = ExcludeKeys<
  ExcludeKeys<
    ExcludeKeys<
      ExcludeKeys<
        ExcludeKeys<
          ExcludeKeys<CreateNodeOptions<T>, "domain">,
          "didWebHostname"
        >,
        "transports"
      >,
      "registry"
    >,
    "factory"
  >,
  "storage"
> & {
  name: string;
  abort: AbortController;
};
type CredDefR<Field = string, Encoded = string> = [Field, Encoded];

export async function resolveConnection(
  connection: Connection
): Promise<DIDDocument> {
  const didUrl = `did:web:${DOMAIN}:peers:${connection.remotePeer.toString()}`;
  const { didDocument } = await didResolver.resolve(didUrl);
  if (!didDocument) {
    throw new Error("Invalid did web document");
  }
  return didDocument;
}

export async function getResourceFromConnection(
  connection,
  type: "schemas" | "definitions"
) {
  const didDocument = await resolveConnection(connection);
  const services = didDocument.service || [];
  if (services.length <= 0) {
    throw new Error("Invalid services");
  }

  const requestedService =
    type === "schemas"
      ? services.find(({ id }) => id === "credentialSchemas")
      : services.find(({ id }) => id === "credentialDefinitions");

  if (!requestedService) {
    throw new Error("Invalid credential definition service");
  }

  const requestedServiceEndpoint: string = Array.isArray(
    requestedService.serviceEndpoint
  )
    ? requestedService.serviceEndpoint[0].uri
    : (requestedService.serviceEndpoint as any).uri;

  if (!requestedServiceEndpoint) {
    throw new Error("Invalid credential definition endpoint");
  }

  const requestedResponse = await axios.get(
    `${requestedServiceEndpoint}/djack.json`
  );

  return type === "schemas"
    ? requestedResponse.data.credentialSchema
    : requestedResponse.data.credentialDefinition;
}

export const load = createAsyncThunk("load", async (_body: any, api) => {
  try {
    console.log(`[LOAD] Loading dependencies`);
    const anoncreds = await Network.getAnoncreds();
    const didcomm = await Network.getDIDComm();
    console.log(`[LOAD] Dependencies loaded`);

    return api.fulfillWithValue({
      anoncreds,
      didcomm,
    });
  } catch (err) {
    return api.rejectWithValue(err);
  }
});

export const walletConnectRequest = createAsyncThunk(
  "walletConnectRequest",
  async (name: string) => {
    console.log(`[walletConnectRequest] Starting`);

    const sessionKey = sessionStorage.getItem("djack");
    const keysJSON = !sessionKey
      ? {}
      : JSON.parse(Buffer.from(sessionKey, "hex").toString());
    keysJSON.name = name;
    delete keysJSON.publicKeys;
    const keysJSONHex = Buffer.from(JSON.stringify(keysJSON)).toString("hex");
    sessionStorage.setItem("djack", keysJSONHex);

    console.log(`[walletConnectRequest] Creating GameChanger link`);

    const gcLink = await create({
      type: "script",
      title: "DJACK",
      description:
        "Getting Access to your Cardano Public Keys to create a PeerDID and start authentication. https://gamechanger.finance/",
      exportAs: "djack",
      run: {
        address: {
          type: "getCurrentAddress",
        },
        spendPubKey: {
          type: "getSpendingPublicKey",
        },
      },
      returnURLPattern: `${NEXT_DOMAIN!}/app`,
    });

    console.log(`[walletConnectRequest] Redirecting to ${gcLink}`);

    if (typeof window !== "undefined") {
      window.location.replace(gcLink);
    }
  }
);

export const walletConnect = createAsyncThunk(
  "walletConnect",
  async (data: PublicKey[], api) => {
    return api.fulfillWithValue(data);
  }
);

export const cancellTask = createAsyncThunk(
  "cancellTask",
  async (controller: AbortController, api) => {
    controller.abort(new Error("User Requested Task to be stopped."));
    return api.fulfillWithValue(null);
  }
);

export const removePeer = createAsyncThunk(
  "removePeer",
  async (peer: PeerId, api) => {
    return api.fulfillWithValue(peer);
  }
);

export const dismissError = createAsyncThunk<
  string,
  string,
  { state: { app: RootState } }
>("dismissError", async (errorId, api) => {
  return api.fulfillWithValue(errorId);
});

export const disconnect = createAsyncThunk(
  "disconnect",
  async (node: Network | null, api) => {
    if (node) {
      await node.stop();
    }
    return api.fulfillWithValue(null);
  }
);

export const removeCredentialOffer = createAsyncThunk(
  "removeCredentialOffer",
  async (offer: Message, api) => {
    return api.fulfillWithValue({
      offer: offer,
    });
  }
);

export const connectDatabase = createAsyncThunk<
  DB,
  {
    name: string;
    publicKeys: PublicKey[];
  },
  { state: { app: RootState } }
>("connectDatabase", async (options, api) => {
  try {
    console.log(`[connectDatabase] Starting`);

    const { name, publicKeys } = options;
    const ed25519 = publicKeys.find((key) => key.curve === Curve.ED25519)!;
    const ed25519JWK = ed25519.export(ExportFormats.JWK);
    const pass = createHash("sha256")
      .update(`djack:${name}:${Buffer.from(ed25519JWK).toString("hex")}`)
      .digest();

    const db = new DB(name, pass);
    await db.findAllDIDs();
    console.log(`[connectDatabase] ok`);
    return api.fulfillWithValue(db);
  } catch (err) {
    return api.rejectWithValue(err as Error);
  }
});

export const verifyDID = createAsyncThunk<
  { didDocument: DIDDocument; peer: PeerId },
  {
    node: Network<Record<string, unknown>>;
    peerId: PeerId;
  },
  { state: { app: RootState } }
>("verifyDID", async (options, api) => {
  try {
    const { peerId, node } = options;
    const didUrl = `did:web:${node.domain}:peers:${peerId.toString()}`;
    console.log(`[verifyDID] Verifying ${didUrl}`);
    const { didDocument } = await didResolver.resolve(didUrl);
    if (!didDocument) {
      throw new Error("Invalid did document");
    }
    console.log(`[verifyDID] OK ${didUrl}`);
    return api.fulfillWithValue({ didDocument, peer: peerId });
  } catch (err) {
    return api.rejectWithValue(err);
  }
});

export const unCurrentNode = createAsyncThunk<
  RootState,
  AbortController,
  { state: { app: RootState } }
>("unCurrentNode", async (abort, api) => {
  try {
    console.log(`[unCurrentNode] Stopping node...`);
    abort.abort(new Error("Unloading node"));
    if (sessionStorage) {
      sessionStorage.removeItem("djack");
    }
    const state = api.getState().app;
    if (state.hasNodeLoaded && state.node) {
      await state.node.stop();
      state.node = null;
      state.hasNodeLoaded = false;
      state.db = null;
      state.hasDBConnected = false;
    }
    return api.fulfillWithValue(state);
  } catch (err) {
    return api.rejectWithValue(err);
  }
});

export const loadNode = createAsyncThunk<
  { db: DB; node: Network<Record<string, unknown>> },
  UINodeOptions<Record<string, unknown>> & { db: DB },
  { state: { app: RootState } }
>("loadNode", async (nodeOptions, api) => {
  const { fulfillWithValue, rejectWithValue, dispatch } = api;

  try {
    console.log(`[loadNode] Launching new node`);

    const { db } = nodeOptions;

    const storage = new StorageManager(nodeOptions.db);
    const factory = new DIDFactory(storage);
    const registry = new Registry();
    const transports = [
      webRTC(),
      webRTCDirect(),
      webSockets({
        filter: filters.all,
      }),
      circuitRelayTransport(),
    ];

    const anoncreds = await Network.getAnoncreds();
    const didcomm = await Network.getDIDComm();
    const node = await Network.createNode<Record<string, unknown>>({
      publicKeys: nodeOptions.publicKeys,
      didWebHostname: DID_WEB_DOMAIN!,
      domain: DOMAIN!,
      factory,
      storage,
      registry,
      transports,
      listen: ["/webrtc"],
      services: {
        identify: identifyService(),
        autoNAT: autoNATService(),
        pubsub: gossipsub(),
        dcutr: dcutrService(),
        dht: kadDHT({
          validators: { ipns: ipnsValidator },
          selectors: { ipns: ipnsSelector },
        }),
        ping: pingService(),
      },
      peerDiscovery: [
        bootstrap({
          list: [
            "/dns4/panama.djack.email/tcp/443/wss/p2p/12D3KooWEURWdLPL3xZJ8qf5Nv7gYSYPNRNpyTrCvaRn6CcYg8Wq/p2p-circuit/p2p/12D3KooWBavU1NVcKx4QydVBUoEityEMuXbK9q1sansySipYsc5V",
            "/dns4/barcelona.djack.email/tcp/443/wss/p2p/12D3KooWCn1o4hxxQKeMS3rQCwbghHVQ145EUTg2pi9PUNP4DRBn/p2p-circuit/p2p/12D3KooWBavU1NVcKx4QydVBUoEityEMuXbK9q1sansySipYsc5V",
          ],
        }),
      ],
    });

    node.onPeerDiscovery = async ({ id, multiaddrs, protocols }) => {
      try {
        if (node.isValidServiceProvider(protocols)) {
          dispatch(reduxActions.discoverySuccess(id));
          await node.p2p.peerStore.save(id, {
            multiaddrs,
            protocols,
          });
          dispatch(reduxActions.domainVerificationOngoing(id));
          const didUrl = `did:web:${DOMAIN!}:peers:${id.toString()}`;
          const { didDocument } = await didResolver.resolve(didUrl);
          if (!didDocument) {
            dispatch(
              reduxActions.domainVerificationFailure(
                new Error("Verification failed for " + didUrl)
              )
            );
          } else {
            dispatch(reduxActions.domainVerificationSuccess(id));

            //Initialise
            const cardanoDID = node.cardanoDID!;
            console.log(cardanoDID.toString(), nodeOptions.name, DOMAIN!);
            const credential = await db.getCredential(
              cardanoDID.toString(),
              nodeOptions.name,
              DOMAIN!
            );

            const { rawHex, offerHex } = credential || {};
            if (offerHex && !rawHex) {
              console.log("With offer, without credential");
              dispatch(
                reduxActions.discoveryUpdate({
                  peerId: id,
                  dbCredential: credential!,
                  didcomm,
                  anoncreds,
                  offerMessage: await CredentialOfferMessage.fromJSON(
                    JSON.parse(Buffer.from(offerHex, "hex").toString())
                  ),
                })
              );
            } else if (offerHex && rawHex) {
              dispatch(
                reduxActions.discoveryUpdate({
                  peerId: id,
                  dbCredential: credential!,
                  didcomm,
                  anoncreds,
                  credentialMessage: await CredentialIssueMessage.fromJSON(
                    JSON.parse(Buffer.from(rawHex, "hex").toString())
                  ),
                  offerMessage: await CredentialOfferMessage.fromJSON(
                    JSON.parse(Buffer.from(offerHex, "hex").toString())
                  ),
                })
              );

              const credentialHex = Buffer.from(rawHex, "hex");
              const credentialMessageJson = JSON.parse(
                credentialHex.toString()
              );

              const credentialMessage = await CredentialIssueMessage.fromJSON(
                credentialMessageJson
              );

              const issuer = credentialMessage.message.as_value().from!;
              const holder = node.peerdid.toString();
              const email =
                credentialMessage.message.as_value().body.values.email.raw;

              const exchangeAuthenticate =
                await ExchangeAuthenticateMessage.fromJSON({
                  from: holder,
                  to: [issuer],
                  body: {
                    email: email,
                    did: node.cardanoDID.toString(),
                  },
                });

              const encrypted = await node.packMessage(
                holder,
                issuer,
                exchangeAuthenticate.message
              );
              const address = multiaddr(process.env.NEXT_PUBLIC_RELAY);
              await node.sendMessage(
                address,
                node.getServiceProtocol(PROTOCOLS.emailExchangeDelivery),
                encrypted
              );
              const existingEmails = await db.getAllCredentialEmails(
                credential!.id!
              );
              existingEmails.forEach((email) => {
                dispatch(reduxActions.emailSuccess(email));
              });
            } else {
              const messageId = anoncreds.createLinksecret();
              const from = node.peerdid;
              const to = getPeerIDDID(id);
              const credentialOffer =
                await CredentialOfferRequestMessage.fromJSON({
                  id: messageId,
                  from: from.toString(),
                  to: [to.toString()],
                  body: {
                    email: `${nodeOptions.name}@${node.domain}`,
                  },
                });
              const encrypted = await node.packMessage(
                from.toString(),
                to.toString(),
                credentialOffer.message
              );

              const response = await node.sendAndGetResponse(
                id,
                node.getServiceProtocol(PROTOCOLS.credentialOfferRequest),
                encrypted
              );

              dispatch(
                reduxActions.requestCredentialOfferSuccess({
                  offer: response,
                  peer: id,
                })
              );
            }
          }
        }
      } catch (err) {
        dispatch(reduxActions.discoveryFailure(err as Error));
      }
    };

    node.p2p.addEventListener("peer:identify", ({ detail }) => {
      const listenerAddress = detail.listenAddrs;
      node.onPeerDiscovery!({
        id: detail.peerId,
        multiaddrs: listenerAddress,
        protocols: detail.protocols,
      });
    });

    console.log(`[loadNode] Testing database connection`);

    await db.findAllDIDs();

    console.log(`[loadNode] Database connection OK`);

    node.addHandler(
      PROTOCOLS.credentialOffer,
      async ({ stream, connection }) => {
        await pipe(stream, async (source) => {
          for await (const msg of source) {
            const message = await node.unpack(msg.subarray());
            const type = message.as_value().type;
            if (type === toDIDCOMMType(PROTOCOLS.credentialOffer)) {
              const cardanoDID = node.cardanoDID!;
              const body = message.as_value().body;
              const messageBuffer = Buffer.from(
                JSON.stringify(message.as_value())
              );

              await db.addCredentialOffer(
                cardanoDID.toString(),
                nodeOptions.name,
                DOMAIN!,
                messageBuffer
              );

              const credential = await db.getCredential(
                cardanoDID.toString(),
                nodeOptions.name,
                DOMAIN!
              );
              console.log(credential);
              const bodyHash = createHash("sha512")
                .update(Buffer.from(JSON.stringify(body)).toString("hex"))
                .digest();
              dispatch(
                reduxActions.acceptCredentialSignaturePending({
                  peer: connection.remotePeer,
                  offer: message,
                  requestedSignature: Buffer.from(bodyHash).toString("hex"),
                })
              );
            }
            return await pipe([msg], stream);
          }
        });

        await stream.close();
      }
    );

    node.addHandler(
      PROTOCOLS.emailExchangeDelivery,
      async ({ stream, connection }) => {
        await pipe(stream, async (source) => {
          for await (const msg of source) {
            try {
              const message = (await node.unpack(msg.subarray())).as_value();
              const type = message.type;
              const from = message.from!;
              const body = message.body;
              const typeCheck = toDIDCOMMType(
                PROTOCOLS.emailExchangePresentationRequest
              );

              if (type === typeCheck) {
                const presentationRequest = body;
                const credentialSchema = await getResourceFromConnection(
                  connection,
                  "schemas"
                );
                const credentialDefinition = await getResourceFromConnection(
                  connection,
                  "definitions"
                );
                const dbCredential = await db.getCredential(
                  node.cardanoDID.toString(),
                  nodeOptions.name,
                  DOMAIN!
                );
                if (!dbCredential) {
                  throw new Error("Credential not found in local database");
                }

                if (!dbCredential.rawHex) {
                  throw new Error(
                    "Credential found in db but does not have issuedRaw value."
                  );
                }
                const linkSecret = dbCredential.linkSecret!;
                const credentialRequestMetadata = JSON.parse(
                  Buffer.from(
                    dbCredential.requestMetadataRawHex!,
                    "hex"
                  ).toString()
                );

                const issuedCredential = JSON.parse(
                  Buffer.from(dbCredential.rawHex, "hex").toString()
                ).body;

                const transformedPresentationRequest = {
                  ...presentationRequest,
                  requested_attributes: Object.keys(
                    presentationRequest.requested_attributes
                  ).reduce((all, currentKey) => {
                    const current =
                      presentationRequest.requested_attributes[currentKey];
                    return {
                      ...all,
                      [current.name]: {
                        name: current.name,
                        restrictions: {
                          ...current.restrictions.reduce(
                            (allRestrictions, currentRestriction) => {
                              return {
                                ...allRestrictions,
                                ...currentRestriction,
                              };
                            },
                            {}
                          ),
                        },
                      },
                    };
                  }, {}),
                };

                const transformedCredentialDefinition = {
                  ...credentialDefinition,
                  value: {
                    ...credentialDefinition.value,
                    primary: {
                      ...credentialDefinition.value.primary,
                      r: Object.keys(
                        credentialDefinition.value.primary.r
                      ).reduce<CredDefR[]>((allR, currentRKey) => {
                        const currentRValue =
                          credentialDefinition.value.primary.r[currentRKey];
                        return [...allR, [currentRKey, currentRValue]];
                      }, []),
                    },
                  },
                };

                const credential = anoncreds.processCredential(
                  transformedCredentialDefinition,
                  issuedCredential,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  credentialRequestMetadata,
                  linkSecret
                );

                const schemas = {
                  [credential.schema_id]: credentialSchema,
                };

                const definitions = {
                  [credential.cred_def_id]: transformedCredentialDefinition,
                };

                const presentation = anoncreds.createPresentation(
                  transformedPresentationRequest,
                  schemas,
                  definitions,
                  credential,
                  linkSecret
                );

                const issuer = from;
                const holder = node.peerdid.toString();
                const presentationMessage =
                  await ExchangePresentationMessage.fromJSON({
                    from: holder,
                    to: [issuer],
                    body: presentation,
                  });
                const encryptedPresentation = await node.packMessage(
                  holder,
                  issuer,
                  presentationMessage.message
                );
                await pipe([encryptedPresentation], stream);
              } else {
                const dbCredential = await db.getCredential(
                  node.cardanoDID.toString(),
                  nodeOptions.name,
                  DOMAIN!
                );
                if (!dbCredential) {
                  throw new Error("No DB Credential on Email Exchange");
                }
                const emailBody = body as MutableParsedMail;

                const email = await db.addEmail(
                  dbCredential.id!,
                  emailBody.from!.text,
                  (emailBody.to! as any).text as string,
                  emailBody.date as unknown as string,
                  emailBody.subject!,
                  emailBody.text!,
                  emailBody.html || ""
                );
                dispatch(reduxActions.emailSuccess(email));
              }
            } catch (err) {
              dispatch(reduxActions.error(err as Error));
            }
          }
        });

        await stream.close();
      }
    );

    console.log(`[loadNode] Starting node`);
    await node.start();
    console.log(`[loadNode] Started node`);

    if (sessionStorage) {
      const sessionKey = sessionStorage.getItem("djack");
      const keysJSON = !sessionKey
        ? {}
        : JSON.parse(Buffer.from(sessionKey, "hex").toString());
      keysJSON.name = nodeOptions.name;
      keysJSON.publicKeys = nodeOptions.publicKeys?.map((key) =>
        JSON.parse(Buffer.from(key.export(ExportFormats.JWK)).toString())
      );
      console.log(`[loadNode] Storing Session ${JSON.stringify(keysJSON)}.`);
      const keysJSONHex = Buffer.from(JSON.stringify(keysJSON)).toString("hex");
      sessionStorage.setItem("djack", keysJSONHex);
    }

    return fulfillWithValue({
      node,
      db: nodeOptions.db,
    });
  } catch (err) {
    console.log(err);
    return rejectWithValue(err);
  }
});

export const requestCredentialOffer = createAsyncThunk<
  {
    offer: Message;
    credential: Message;
    request: [Anoncreds.CredentialRequest, Anoncreds.CredentialRequestMeta];
  },
  {
    name: string;
    db: DB;
    credentialId: number;
    peer: PeerId;
    offerHex: string;
    signatureHex: string;
    node: Network<Record<string, unknown>>;
  },
  { state: { app: RootState } }
>("requestCredentialOffer", async (options, api) => {
  try {
    const anoncreds = await Network.getAnoncreds();

    const { name, offerHex, node, peer, db, credentialId } = options;
    const didUrl = `did:web:${DOMAIN}:peers:${peer.toString()}`;

    const { didDocument } = await didResolver.resolve(didUrl);
    if (!didDocument) {
      throw new Error("Invalid did web document");
    }

    const services = didDocument.service || [];
    if (services.length <= 0) {
      throw new Error("Invalid services");
    }

    const credentialDefinitionService = services.find(
      ({ id }) => id === "credentialDefinitions"
    );

    if (!credentialDefinitionService) {
      throw new Error("Invalid credential definition service");
    }

    const credentialDefinitionEndpoint = Array.isArray(
      credentialDefinitionService.serviceEndpoint
    )
      ? credentialDefinitionService.serviceEndpoint[0].uri
      : (credentialDefinitionService.serviceEndpoint as any).uri;

    if (!credentialDefinitionEndpoint) {
      throw new Error("Invalid credential definition endpoint");
    }

    const credentialDefinitionResponse = await axios.get(
      `${credentialDefinitionEndpoint}/djack.json`
    );

    const credentialDefinition =
      credentialDefinitionResponse.data.credentialDefinition;

    const offerBuffer = Buffer.from(offerHex, "hex");
    const offerMessageJson = JSON.parse(offerBuffer.toString());
    const offer = await ExchangeAuthenticateMessage.fromJSON(offerMessageJson);

    const offerMessage = offer.message;
    const issuer = offerMessage.as_value().from!;
    const credentialOffer = offerMessage.as_value().body;

    const linkSecret = anoncreds.createLinksecret();
    const credentialRequest = anoncreds.createCredentialRequest(
      credentialOffer,
      credentialDefinition,
      linkSecret,
      "demo"
    );

    const credentialRequestMetadata = Buffer.from(
      JSON.stringify(credentialRequest[1])
    );

    await db.updateCredentialRequest(
      credentialId,
      linkSecret,
      credentialRequestMetadata
    );

    const credentialRequestBody = {
      email: `${name}@${node.domain}`,
      offer: credentialOffer,
      request: credentialRequest[0],
      did: node.cardanoDID!.toString(),
    };

    const { message } = await CredentialRequestMessage.fromJSON({
      id: anoncreds.createLinksecret(),
      from: node.peerdid.toString(),
      to: [offerMessage.as_value().from!],
      body: credentialRequestBody,
    });

    const encrypted = await node.packMessage(
      node.peerdid.toString(),
      issuer,
      message
    );
    console.log(`[CredentialIssue] Sending Credential Request to `, peer);
    const response = await node.sendAndGetResponse(
      peer,
      node.getServiceProtocol(PROTOCOLS.credentialIssue),
      encrypted
    );
    console.log(
      `[CredentialIssue] Got Credential Request response (issued credential)`
    );
    const credentialJson = JSON.stringify(response.as_value());

    const credentialIssuedHex = Buffer.from(credentialJson);

    await db.updateCredential(credentialId, credentialIssuedHex);

    return api.fulfillWithValue({
      request: credentialRequest,
      credential: response,
      offer: offerMessage,
    });
  } catch (err) {
    console.log(err);
    return api.rejectWithValue(err);
  }
});
