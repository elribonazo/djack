/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { useMountedApp } from "../reducers/store";
import Dexie from "dexie";
import { reduxActions } from "../reducers/app";

type WalletConnectProps = {
  abort: AbortController;
};
export const WalletConnect: React.FC<WalletConnectProps> = (props) => {
  const mounted = useMountedApp();
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [databases, setDatabases] = useState<string[]>();
  const [account, setAccount] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>();
  const { peers, hasNodeLoaded } = mounted;

  const currentActiveAccount = mounted.hasNodeLoaded ? mounted.name : "";
  const filteredDatabases =
    databases?.filter((database) => database !== currentActiveAccount) || [];
  useEffect(() => {
    Dexie.getDatabaseNames()
      .then((dbNames) => {
        setDatabases(dbNames);
      })
      .catch(reduxActions.error);
  }, []);

  const credentialOffers = peers
    .filter((peer) => peer.offer !== null && !peer.credential)
    .map(({ offer }) => offer!);

  const notifications = credentialOffers.length;

  async function onWalletConnectClick(name: string) {
    return mounted.walletConnectRequest(name);
  }

  function onLogoutClick() {
    return mounted.unCurrentNode(props.abort);
  }

  if (filteredDatabases === undefined) return null;

  if (hasNodeLoaded) {
    return (
      <div
        className={`relative`}
        onMouseEnter={() => {
          setCollapsed(false);
        }}
        onMouseLeave={() => {
          setCollapsed(true);
        }}
      >
        <button
          className={`text-white  ${
            hasNodeLoaded ? "bg-gray-800" : ""
          } focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800`}
        >
          <img
            src="/gc.png"
            width={120}
            height={34}
            alt="QR Code"
            className="rounded-lg"
          />
        </button>

        {collapsed === false && (
          <div className="absolute right-0 bg-white px-3 shadow rounded-lg w-80 min-h-30">
            {filteredDatabases !== undefined && (
              <>
                {filteredDatabases.length > 0 ? (
                  <p className="text-sm">Switch to another account</p>
                ) : null}
                <div className="w-80 flex justify-end min-h-30">
                  <ul className="w-80">
                    {filteredDatabases.map((name, i) => {
                      return (
                        <li
                          key={`db${i}`}
                          onClick={() => {
                            setAccount(name);
                            setSelectedAccount(name);
                            onWalletConnectClick(name);
                          }}
                        >
                          <button>
                            <b>{name}</b>{" "}
                            <img
                              src="/gc.png"
                              width={120}
                              height={34}
                              alt="QR Code"
                              className="rounded-lg mb-1"
                            />
                          </button>
                        </li>
                      );
                    })}
                    <li>
                      <button onClick={onLogoutClick}>
                        <b>Logout</b>{" "}
                        <img
                          src="/gc.png"
                          width={120}
                          height={34}
                          alt="QR Code"
                          className="rounded-lg mb-1"
                        />
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${
        notifications > 0 && collapsed ? "animate-bounce-slow" : ""
      }`}
      onMouseEnter={() => {
        setCollapsed(false);
      }}
      onMouseLeave={() => {
        setCollapsed(true);
      }}
    >
      <button
        className={`text-white ${
          hasNodeLoaded ? "bg-gray-800" : ""
        } focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm text-center  dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800`}
      >
        WALLET CONNECT
      </button>

      {collapsed === false && (
        <div className="absolute right-0 bg-white p-3 shadow rounded-lg w-80 min-h-30">
          <p className="text-sm">Create new account (min 4 char)</p>
          <input
            type="text"
            id="account"
            placeholder="javi"
            required
            value={account}
            className="bg-gray-50 mt-5 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onChange={(e) => {
              setAccount(e.target.value);
              if (e.target.value.length > 3) {
                setSelectedAccount(e.target.value);
              } else {
                setSelectedAccount(undefined);
              }
            }}
          />
          {!selectedAccount &&
            account === "" &&
            databases !== undefined &&
            databases.length > 0 && (
              <>
                <p className="text-sm">Available accounts</p>
                <div className="w-80 flex justify-end min-h-30">
                  <ul className="w-80">
                    {databases.map((name, i) => {
                      return (
                        <li
                          key={`db${i}`}
                          onClick={() => {
                            setAccount(name);
                            if (name.length > 3) {
                              setSelectedAccount(name);
                            } else {
                              setSelectedAccount(undefined);
                            }
                          }}
                        >
                          {i + 1}. <b>{name}</b>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

          <button onClick={() => onWalletConnectClick(account)} className="mt-4">
            <img
              src="/gc.png"
              width={120}
              height={34}
              alt="QR Code"
              className="rounded-lg mb-1"
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
