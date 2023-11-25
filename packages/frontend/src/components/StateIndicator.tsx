import { connect, ConnectedProps } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import { RootState } from "../reducers/app";
import * as actions from "../actions";

type StateIndicatorProps = ConnectedProps<typeof connector>;

export const StateIndicator: React.FC<StateIndicatorProps> = (props) => {
  function getStateConnectionString(props: StateIndicatorProps) {
    const {
      isLoading,
      hasLoaded,
      isNodeLoading,
      hasNodeLoaded,
      isDiscovering,
      peers,
    } = props;
    const isVerifying = peers.some((peer) => peer.isVerifying);
    const isRequesting = peers.some((peer) => peer.isRequestingOffer);
    if (!hasLoaded && isLoading) {
      return "Loading dependencies";
    }
    if (!hasNodeLoaded && !isNodeLoading) {
      return null;
    }
    if (isNodeLoading) {
      return "Connecting Node";
    }
    if (isDiscovering) {
      return "Discovering";
    }
    if (isVerifying) {
      return "Verifying peer";
    }
    if (isRequesting) {
      return "Requesting Preview";
    }

    return null;
  }
  const hasText = getStateConnectionString(props);
  return (
    <>
      {hasText && (
        <span className="ml-5 px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">
          {hasText}{" "}
        </span>
      )}
    </>
  );
};

const connector = connect(
  (state: { app: RootState }) => ({
    ...state.app,
  }),
  (dispatch: Dispatch<any>) => bindActionCreators(actions, dispatch)
);

export default connector(StateIndicator);
