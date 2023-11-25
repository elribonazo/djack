import { useMountedApp } from "../reducers/store";
import { NavigationItemLabel } from "./InboxTypes";

type NavigationItemsContainerProps = {
  activeTab: NavigationItemLabel;
  onActiveTabChange: (NavigationItemLabel) => Promise<void> | void;
  items: { icon: JSX.Element; label: NavigationItemLabel }[];
};
const NavigationItemsContainer = (props: NavigationItemsContainerProps) => {
  const mounted = useMountedApp();

  const { onActiveTabChange, items, activeTab } = props;

  return (
    <div className="flex sm:mx-4 flex-grow mt-4 sm:mt-10 flex-col text-gray-400 space-y-4">
      {items.map((item, i) => {
        const pendingCredentials = mounted.peers.filter(
          (peer) => peer.offer && !peer.credential
        );
        const completedCredentials = mounted.peers.filter(
          (peer) => peer.offer && peer.credential
        );
        const extraPendingCredentials =
          item.label === NavigationItemLabel.Credentials
            ? pendingCredentials.length
            : null;

        const extraCompletedCredentials =
          item.label === NavigationItemLabel.Credentials
            ? completedCredentials.length
            : null;

        return (
          <div key={`${item.label}${i}`}>
            <div className="hidden sm:block">
              <button
                onClick={() => {
                  onActiveTabChange(item.label);
                }}
                className={
                  "flex text-md h-10 items-center space-x-2 rounded-md p-2 " +
                  (activeTab === item.label
                    ? "bg-blue-100 text-blue-500"
                    : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800")
                }
              >
                {item.icon}
                <div className="text-md">
                  {item.label}
                  {extraPendingCredentials && extraPendingCredentials > 0 ? (
                    <div className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-yellow-600 border-2 border-white rounded-full -top-2 -right-2 ">
                      {extraPendingCredentials}
                    </div>
                  ) : null}
                  {extraCompletedCredentials &&
                  extraCompletedCredentials > 0 ? (
                    <div className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-green-600 border-2 border-white rounded-full -top-2 -right-2 ">
                      {extraCompletedCredentials}
                    </div>
                  ) : null}
                </div>
              </button>
            </div>
            <div className="block sm:hidden">
              <button
                key={`${item.label}${i}`}
                onClick={() => {
                  onActiveTabChange(item.label);
                }}
                className={
                  "  text-md h-10  items-center space-x-2 rounded-md p-2 " +
                  (activeTab === item.label
                    ? "bg-blue-100 text-blue-500"
                    : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800")
                }
              >
                {item.icon}

                {extraCompletedCredentials && extraCompletedCredentials > 0 ? (
                  <div className="relative items-center justify-center w-6 h-6 text-xs font-bold text-white bg-green-600 border-2 border-white rounded-full -top-2 -right-2 ">
                    {extraCompletedCredentials}
                  </div>
                ) : null}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NavigationItemsContainer;
