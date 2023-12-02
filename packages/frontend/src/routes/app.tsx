/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import JSONURL from "json-url";
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useMemo, useState } from "react";
import { sha256 } from '@noble/hashes/sha256';

import { App } from "../templates/App";
import { LoadingScreen } from "../components/LoadingScreen";
import { useMountedApp } from "../reducers/store";
import { peerIdFromString } from "@libp2p/peer-id";
import EmailLayout from "../components/EmailLayout";

import { createX25519PublicKeyFromEd25519PublicKey } from '@djack-sdk/did-peer';
import {ExportFormats, ExportableEd25519PublicKey} from '@djack-sdk/interfaces';
import { Domain } from "@atala/prism-wallet-sdk";
import { useLocation, useNavigate } from "react-router-dom";


const AppTemplate: React.FC = () => {
  const connectingTaskAbort = useMemo(() => new AbortController(), []);
  const location = useLocation();
  const navigation = useNavigate();
  const mounted = useMountedApp();

  const { name, session, load, hasLoaded, isLoading, walletConnected } =
    mounted;
  const publicKeys = session.publicKeys;

  const [isScreenReady, setScreenReady] = useState<boolean>(false);

  const queryParams = new URLSearchParams(location.search);
  const queryResult = queryParams.get('result');
  const pathname = location.pathname;
  const routerReplace = (options: {pathname: string, query: any}) => {
    const newSearchParams = new URLSearchParams();
    for(let key of Object.keys(options.query)) {
      newSearchParams.set(key, options.query[key]);
    }
    // Replace the current path with the new path and query parameters
    navigation(`${options.pathname}${newSearchParams.size > 0 ? `?${newSearchParams.toString()}`:``}`, { replace: true });
  };

  useEffect(() => {

      if (
        !walletConnected &&
        queryResult &&
        name &&
        !mounted.hasNodeLoaded &&
        !mounted.isNodeLoading
      ) {
        JSONURL("lzma")
          .decompress(queryResult)
          .then(({ exports }) => {
            const {
              djack: { address, spendPubKey },
            } = exports;
            if (address && spendPubKey) {
              const { pubKeyHex } = spendPubKey;
  
              const pub = Buffer.from(pubKeyHex, "hex");
              const ed25519 = new ExportableEd25519PublicKey(pub);
              const ed25519JWK = ed25519.export(ExportFormats.JWK);
  
              const x25519 = createX25519PublicKeyFromEd25519PublicKey(ed25519);
              routerReplace({
                pathname: pathname,
                query: {},
              });
  
              const publicKeys = [ed25519, x25519];
              const pass = sha256( `djack:${name.replace("djack:", "")}:${Buffer.from(
                ed25519JWK
              ).toString("hex")}`)
  
              import("../utils/DB").then(({DB}) => {
                mounted.loadNode({
                  listen: [],
                  db: new DB(name, pass),
                  abort: connectingTaskAbort,
                  publicKeys,
                  name,
                });
              })
             
            }
          });
      } else if (
        !walletConnected &&
        queryResult &&
        name &&
        mounted.hasNodeLoaded &&
        !mounted.isNodeLoading &&
        mounted.hasDiscovered
      ) {
        JSONURL("lzma")
          .decompress(queryResult)
          .then(({ exports }) => {
            const {
              djack: { usingCurrentAddress },
            } = exports;
  
            
  
            if (usingCurrentAddress) {
              const peerAddress = process.env.NEXT_PUBLIC_RELAY;
              const peerAddressParts = peerAddress!.split("/");
              const peerIdString = peerAddressParts[peerAddressParts.length - 1]!;
              const peerId = peerIdFromString(peerIdString);
              const cardanoDID = mounted.node!.cardanoDID!.toString();
              const nodeDomain = mounted.node!.domain;
              const signatureHex = usingCurrentAddress.sign.signature;
              mounted.db
                ?.getCredential(cardanoDID, name!, nodeDomain)
                .then((credential) => {
                  if (credential) {
                    const peer = mounted.peers.find(
                      (peerRecord) => peerRecord.credentialId === credential.id!
                    );
                    if (peer?.hasVerified) {
                      const { offerHex } = credential;
                      if (offerHex) {
                        routerReplace({
                          pathname: pathname,
                          query: {},
                        });
                        mounted.requestCredentialOffer({
                          name: mounted.name!,
                          credentialId: credential.id!,
                          db: mounted.db!,
                          peer: peerId,
                          offerHex: offerHex,
                          signatureHex: signatureHex,
                          node: mounted.node!,
                        });
                      }
                    }
                  }
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          });
      } else if (
        !walletConnected &&
        name &&
        session.publicKeys.length &&
        !mounted.hasNodeLoaded &&
        !mounted.isNodeLoading &&
        !mounted.node
      ) {
        const ed25519 = session.publicKeys.find(
          ({ curve }) => curve === Domain.Curve.ED25519
        )!;
        const ed25519JWK = ed25519.export(ExportFormats.JWK);
        const pass = sha256( `djack:${name.replace("djack:", "")}:${Buffer.from(
          ed25519JWK
        ).toString("hex")}`)
          import("../utils/DB").then(({DB}) => {
            mounted.loadNode({
              listen: [],
              db: new DB(name, pass),
              abort: connectingTaskAbort,
              publicKeys,
              name,
            });
          });
        
      }
    
   
  }, [
    connectingTaskAbort,
    mounted,
    name,
    pathname,
    publicKeys,
    queryResult,
    session.publicKeys,
    walletConnected,
  ]);

  useEffect(() => {
    if (!hasLoaded && !isLoading) {
      load(null);
    }
  }, [hasLoaded, isLoading, load, walletConnected]);

  useEffect(() => {
    if (
      mounted.hasNodeLoaded &&
      mounted.hasDBConnected &&
      mounted.hasDiscovered
    ) {
      setScreenReady(true);
    } else if (!name) {
      setScreenReady(true);
    }
  }, [
    mounted.hasDBConnected,
    mounted.hasDiscovered,
    mounted.hasNodeLoaded,
    name,
  ]);
  return (
    <App
      abort={connectingTaskAbort}
    >
      {!isScreenReady && <LoadingScreen />}

      {isScreenReady && (
        <>
          {mounted.hasNodeLoaded && <EmailLayout />}
          {mounted.hasNodeLoaded === false && (
            <div
              className="flex items-center justify-center px-4 mx-auto text-center py-16"
              style={{ height: "calc(100vh - 160px)" }}
            >
              <div>
                <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-500 ">
                  ¿How does it work?
                </h1>
                <p className="mb-8 font-normal text-gray-500 text-xl px-48 dark:text-gray-400">
                  First you will need to connect using the wallet connect in the
                  top right side of the screen.
                </p>
                <h3 className="mb-8 font-normal text-gray-500 text-xl px-48 dark:text-gray-400 mt-10">
                  Step by step:
                </h3>
                <ol className="mb-8 font-normal text-gray-500 text-xl px-48 dark:text-gray-400">
                  <li className=" text-sm m-5">
                    Connect your account with GameChanger Wallet + PublicKeys
                  </li>
                  <li className=" text-sm m-5">
                    Wait for connections from service providers (email servers)
                  </li>
                  <li className=" text-sm m-5">
                    When a connection arrives, verify the DID:WEB attached to
                    it, resolve the DIDDocument
                  </li>
                  <li className=" text-sm m-5">
                    Establish connection with provider
                  </li>
                  <li className=" text-sm m-5">
                    Provider will send you a Credential Offer
                  </li>
                  <li className=" text-sm m-5">
                    You'll sign the Credential Offer and create a
                    CredentialRequest (anonCreds V1)
                  </li>
                  <li className=" text-sm m-5">
                    The provider will verify your identity and issue you a
                    credential
                  </li>
                  <li className=" text-sm m-5">
                    You now own (not exclusively) the right to receive emails on
                    that account, the credential is stored and you can use it at
                    any time to connect and receive emails
                  </li>
                </ol>
              </div>
            </div>
          )}
        </>
      )}
    </App>
  );
};

export default AppTemplate;
