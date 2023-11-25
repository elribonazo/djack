import { useMountedApp } from "../reducers/store";

const MainHeader = () => {
  const mounted = useMountedApp();
  return (
    <div className="h-10 flex-none w-full border-b border-gray-200 dark:border-gray-800 ">
      <div className="mx-auto flex justify-end">
        <button className="flex items-right mx-6 mt-2">
          <div className="text-xs text-right">
            <span className="ml-2 text-green-600">Active Account: </span>
            <span className="ml-2">{`${mounted.name}@${
              mounted.node!.domain
            }`}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default MainHeader;
