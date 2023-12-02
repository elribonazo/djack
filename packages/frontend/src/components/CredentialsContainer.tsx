/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { useEffect, useState } from "react";
import { Connection } from "@libp2p/interface/connection";
import { sha512 } from '@noble/hashes/sha512';

import { useMountedApp } from "../reducers/store";
import { NEXT_DOMAIN } from "../config";
import GCButton from "./GCButton";
import { LoadingScreen } from "./LoadingScreen";
import { PeerRecord } from "../reducers/app";
import { Network } from "@djack-sdk/network";
import { getResourceFromConnection } from "../actions";

type CredentialsContainerProps = any;

export const CredentialsContainer: React.FC<CredentialsContainerProps> = () => {
  const mounted = useMountedApp();
  const [loaded, setLoaded] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [incompleteCredentials, setIncompleteCredentials] = useState<
    PeerRecord[]
  >([]);
  const { peers } = mounted;

  const completeCredentials = peers.filter((peer) => peer.credential);
  useEffect(() => {
    async function loadIncomplete(peers: PeerRecord[]) {
      setLoading(true);
      if (!mounted.db) {
        throw new Error("No Database connection");
      }
      const anonCreds = await Network.getAnoncreds();

      const loadPeersList: PeerRecord[] = [];
      for (let i = 0; i < peers.length; i++) {
        if (!peers[i]!.id) {
          throw new Error("peer not available");
        }
        const linkSecret = anonCreds.createLinksecret();
        const credentialOffer = peers[i]!.offer?.as_value().body;
        const connection = {
          remotePeer: peers[i]!.id,
        } as Connection;
        const credentialDefinition = await getResourceFromConnection(
          connection,
          "definitions"
        );
        const [credentialRequest] = anonCreds.createCredentialRequest(
          credentialOffer,
          credentialDefinition,
          linkSecret,
          "demo"
        );
        const requestedSignature = sha512(Buffer.from(JSON.stringify(credentialRequest)))

        const loadedPeer: any = {
          ...peers[i],
          requestedSignature: Buffer.from(requestedSignature).toString("hex"),
        };
        loadPeersList.push(loadedPeer);
      }

      setLoading(false);
      return loadPeersList;
    }

    if (!loading && !loaded) {
      loadIncomplete(
        peers.filter(
          (peer) =>
            peer.offer && !peer.isRequestingCredential && !peer.credential
        )
      ).then((loadedPeers) => {
        setIncompleteCredentials(loadedPeers);
        setLoaded(true);
      });
    }
  });

  if (!loaded) {
    return <LoadingScreen useFixed={false} />;
  }

  return (
    <div className="mx-10">
      <p>Credentials</p>
      {completeCredentials.map((peer, i) => {
        return (
          <p key={`completeCred${i}`}>
            You have 1 Credential with {peer.id.toString()}
          </p>
        );
      })}
      {incompleteCredentials.map((peer, i) => {
        return (
          <p key={`incomplete${i}`}>
            You have 1 Credential Offer from {peer.id.toString()}
            <GCButton
              script={{
                type: "script",
                title: "DJACK",
                description: `Sign ${peer.id.toString()} credentialOffer to claim your email account`,
                exportAs: "djack",
                run: {
                  dependencies: {
                    type: "script",
                    run: {
                      currentAddress: {
                        type: "getCurrentAddress",
                      },
                      currentAddressInfo: {
                        type: "macro",
                        run: "{getAddressInfo(get('cache.dependencies.currentAddress'))}",
                      },
                      // credential: {
                      //   type: "data",
                      //   value: peer.credentialId,
                      // },
                      data: {
                        type: "data",
                        value: `Please sign ${peer.requestedSignature}`,
                      },
                      dataHex: {
                        type: "macro",
                        run: "{strToHex(get('cache.dependencies.data'))}",
                      },
                    },
                  },
                  data: {
                    type: "script",
                    exportAs: "InputData",
                    run: {
                      data: {
                        type: "macro",
                        run: "{get('cache.dependencies.data')}",
                      },
                      dataHex: {
                        type: "macro",
                        run: "{get('cache.dependencies.dataHex')}",
                      },
                    },
                  },
                  usingCurrentAddress: {
                    type: "script",
                    exportAs: "UsingCurrentAddress",
                    run: {
                      address: {
                        type: "macro",
                        run: "{get('cache.dependencies.currentAddress')}",
                      },
                      // credential: {
                      //   type: "macro",
                      //   id: "{get('cache.dependencies.credential')}",
                      // },
                      sign: {
                        type: "signDataWithAddress",
                        address: "{get('cache.usingCurrentAddress.address')}",
                        dataHex: "{get('cache.dependencies.dataHex')}",
                      },
                      verify: {
                        type: "verifySignatureWithAddress",
                        address: "{get('cache.usingCurrentAddress.address')}",
                        dataHex: "{get('cache.dependencies.dataHex')}",
                        dataSignature:
                          "{get('cache.usingCurrentAddress.sign')}",
                      },
                    },
                  },
                },
                returnURLPattern: `${NEXT_DOMAIN!}/app`,
              }}
            />
          </p>
        );
      })}
    </div>
  );
};
