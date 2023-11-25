import { useMountedApp } from "../reducers/store";

type LoadingScreenProps = {
  useFixed?: boolean;
};
export const LoadingScreen: React.FC<LoadingScreenProps> = (props) => {
  const useFixed = props.useFixed !== undefined ? props.useFixed : true;
  const mounted = useMountedApp();
  const { errors } = mounted;
  const hasErrors = errors && errors.length > 0;

  const group = errors.reduce((allErrors, current) => {
    const foundIndex = allErrors.findIndex(
      (errEntry) => errEntry.message.message === current.message
    );

    if (foundIndex >= 0 && allErrors[foundIndex]) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      allErrors[foundIndex]!.num++;
      return allErrors;
    }

    return [
      ...allErrors,
      {
        num: 1,
        message: current,
      },
    ];
  }, [] as { message: Error; num: number }[]);
  return (
    <div
      className={`${
        useFixed ? `fixed top-0 left-0 right-0 bottom-0` : ""
      } w-full h-screen z-50 overflow-hidden bg-gray-700 flex  flex-col items-center justify-center`}
    >
      <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
      <h2 className="text-center text-white text-xl font-semibold">
        Loading...
      </h2>
      <div className="w-1/3 text-center text-white">
        <p>This may take a few seconds, please don&apos;t close this page.</p>

        {hasErrors &&
          group.map((error, i) => {
            return (
              <div key={`err${i}`}>
                Error: {error.message.message} happened {error.num}
              </div>
            );
          })}
      </div>
    </div>
  );
};
