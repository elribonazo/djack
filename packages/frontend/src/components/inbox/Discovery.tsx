/* eslint-disable react/no-unescaped-entities */
import * as actions from "../../actions";
import { ConnectedProps, connect } from "react-redux";
import { Dispatch, bindActionCreators } from "redux";
import { RootState } from "../../reducers/app";

type DiscoveryProps = ConnectedProps<typeof connector>;

export const Discovery: React.FC<
  DiscoveryProps & { abort: AbortController }
> = (props) => {
  return (
    <div
      className={`w-full px-10  rounded-lg  dark:bg-gray-800 dark:border-gray-700`}
    >
      <p className="text-gray-200">
        Please wait while we try finding the right service providers in the
        network.
        <br />
        <strong>[NOTE]</strong>: If you struggle to connect, cancell and repeat
        the process!
      </p>
      <p>
        <span className="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">
          Performing search...
        </span>{" "}
        <button
          className="px-3 py-1 text-xs"
          onClick={() => {
            props.cancellTask(props.abort);
          }}
        >
          Cancell
        </button>
      </p>
    </div>
  );
};

const connector = connect(
  (state: { app: RootState }) => ({
    ...state.app,
  }),
  (dispatch: Dispatch<any>) => bindActionCreators(actions, dispatch)
);

export default connector(Discovery);
