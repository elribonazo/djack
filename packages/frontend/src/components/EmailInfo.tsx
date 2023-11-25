/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { dbEmail } from "../utils/DB";
import { stringToColor } from "../utils/inboxUtils";

type EmailInfoProps = dbEmail & {
  onClick?: (message: dbEmail) => Promise<void> | void;
};

const EmailInfo = (props: EmailInfoProps) => {
  const { date, from, subject, text } = props;

  const selected = false;
  const time = date;
  const body = text!;
  return (
    <button
      onClick={() => {
        if (props.onClick) {
          props.onClick(props);
        }
      }}
      className={
        "p-3 pr-6 w-full flex flex-col items-center dark:bg-gray-800 border-b border-gray-200 " +
        (!selected
          ? "bg-gray-100 hover:bg-gray-200 border-r border-gray-200 dark:border-gray-800"
          : "bg-white focus:outline-none")
      }
    >
      <div className="flex flex-row items-center font-medium text-gray-700 dark:text-white w-full">
        <span
          className="w-10 h-10 mr-2 rounded-full flex items-center justify-center text-xs text-white"
          style={{ backgroundColor: stringToColor(from) }}
        ></span>
        <span className="truncate">{from}</span>
        <span className="ml-auto text-xs text-gray-500">{time}</span>
      </div>
      <div className="pb-2 mb-2 w-full text-left pl-12">
        <span className="text-base text-gray-700 dark:text-gray-300 block truncate">
          {subject}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-500">
          {body?.slice(0, 100)}...
        </span>
      </div>
      <div className="w-full flex justify-end space-x-4">
        {/* {attachment && <MdAttachment size={20} />} */}
        {/* {read ? (
          <MdMarkEmailRead size={20} color="#4BB543" />
        ) : (
          <MdMarkEmailUnread size={20} color="#FDBA74" />
        )} */}
      </div>
    </button>
  );
};

export default EmailInfo;
