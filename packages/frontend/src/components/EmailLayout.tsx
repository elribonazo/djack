import {
  MdInbox,
  MdDrafts,
  MdOutlineConnectWithoutContact,
} from "react-icons/md";
import { useMountedApp } from "../reducers/store";
import EmailDetails from "./EmailDetails";
import EmailDetailsColumn from "./EmailDetailsColumn";
import EmailInfo from "./EmailInfo";
import EmailsDataContainer from "./EmailsDataContainer";
import EmailsInfoColumn from "./EmailsInfoColumn";
import MainContainer from "./MainContainer";
import MainHeader from "./MainHeader";
import NavigationContainer from "./NavigationContainer";
import NavigationItemsContainer from "./NavigationItemsContainer";
import { useEffect, useState } from "react";
import { NavigationItemLabel } from "./InboxTypes";
import { CredentialsContainer } from "./CredentialsContainer";
import type { dbEmail } from "../utils/DB";

const EmailLayout = () => {
  const mounted = useMountedApp();
  const [activeEmail, setActiveEmail] = useState<dbEmail>();
  const credentials = mounted.peers.filter(
    (peer) => peer.offer && !peer.credential
  );

  const defaultTab =
    credentials.length > 0
      ? NavigationItemLabel.Credentials
      : NavigationItemLabel.Inbox;

  const [activeTab, setActiveTab] = useState<NavigationItemLabel>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const navigationItems = [
    {
      icon: <MdInbox size={25} />,
      label: NavigationItemLabel.Inbox,
    },
    {
      icon: <MdDrafts size={25} />,
      label: NavigationItemLabel.Credentials,
    },
    {
      icon: <MdOutlineConnectWithoutContact size={25} />,
      label: NavigationItemLabel.Connections,
    },
  ];
  const { emails, node } = mounted;
  const allConnections = node?.p2p.getConnections();

  const relayConnections = allConnections?.filter(
    (connection) => !connection.remoteAddr.toString().includes("/p2p-circuit/")
  );

  const providers = allConnections?.filter((connection) =>
    connection.remoteAddr.toString().includes("/p2p-circuit/")
  );

  const [error] = mounted.errors.slice(0, 1);

  function onDismissClick() {
    if (error) {
      mounted.dismissError(error.id);
    }
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 dark:text-white text-gray-600 h-screen flex overflow-hidden text-sm">
      {error && (
        <div className="fixed z-10 inset-0 overflow-y-auto" id="my-modal">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id="modal-headline"
                  >
                    Error
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {error.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  onClick={onDismissClick}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <NavigationContainer>
        <NavigationItemsContainer
          activeTab={activeTab}
          items={navigationItems}
          onActiveTabChange={(label) => {
            setActiveTab(label);
          }}
        />
      </NavigationContainer>
      <MainContainer>
        {activeTab === NavigationItemLabel.Connections && (
          <div className="mx-10">
            <h1>RELAYS</h1>
            {relayConnections?.map((connection) => {
              return (
                <div key={`connection${connection.id}`}>
                  <h2>{connection.remoteAddr.toJSON()}</h2>
                </div>
              );
            })}
            <h1>Service Providers</h1>
            {providers?.map((connection) => {
              return (
                <div key={`serviceProviders${connection.id}`}>
                  <h2>{connection.remotePeer.toString()}</h2>
                </div>
              );
            })}
          </div>
        )}
        {activeTab === NavigationItemLabel.Inbox && (
          <>
            <MainHeader />
            <EmailsDataContainer>
              <EmailsInfoColumn isOpen={activeEmail !== undefined}>
                {emails.map((email, i) => (
                  <EmailInfo
                    key={`email${i}`}
                    onClick={setActiveEmail}
                    {...email}
                  />
                ))}
              </EmailsInfoColumn>
              {activeEmail && (
                <EmailDetailsColumn>
                  <EmailDetails email={activeEmail} />
                </EmailDetailsColumn>
              )}
            </EmailsDataContainer>
          </>
        )}
        {activeTab === NavigationItemLabel.Credentials && (
          <CredentialsContainer />
        )}
      </MainContainer>
    </div>
  );
};

export default EmailLayout;
