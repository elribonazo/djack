/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MdSend } from "react-icons/md";
import { dbEmail } from "../utils/DB";
import { useMountedApp } from "../reducers/store";
import { stringToColor } from "../utils/inboxUtils";

type EmailDetailsProps = { email: dbEmail };

const EmailDetails = (props: EmailDetailsProps) => {
  const mounted = useMountedApp();
  const { email } = props;

  const { date, from, subject, text } = email;

  const time = date?.toString();
  const body = text!;

  const currentAccount = `${mounted.name}@${mounted.node?.domain}`;

  const enableResponse = true;
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto bg-white p-6">
        <div className="flex flex-row items-center font-medium text-gray-700 dark:text-white w-full">
          <span
            className="w-10 h-10 mr-2 rounded-full flex items-center justify-center text-xs text-white"
            style={{ backgroundColor: stringToColor(from) }}
          ></span>
          <span className="truncate">{from}</span>
          <span className="ml-auto text-xs text-gray-500">{time}</span>
        </div>
        <div className="mt-12 pb-2 mb-2 w-full text-left">
          <span className="text-base text-gray-700 dark:text-gray-300 block truncate">
            {subject}
          </span>
          <span className="mt-6 text-sm text-gray-500 dark:text-gray-500">
            {body}
          </span>
        </div>
      </div>
      {enableResponse && (
        <div className="h-1/3 bg-white p-6">
          <div className="h-full w-full border border-gray-200 p-4">
            <div className="flex flex-row items-center font-medium text-gray-700 dark:text-white w-full">
              <span
                className="w-10 h-10 mr-2 rounded-full flex items-center justify-center text-xs text-white"
                style={{ backgroundColor: stringToColor("ME") }}
              >
                ME
              </span>
              <span className="truncate">{currentAccount}</span>
            </div>

            {/* Textarea para el Cuerpo del Correo */}
            <textarea
              className="w-full h-32 mt-4 p-2 resize-none focus:outline-none"
              placeholder="Escribe tu mensaje aquí..."
            ></textarea>

            {/* Botones de Enviar y Adjuntar Archivo */}
            <div className="flex justify-start">
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">
                <MdSend />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDetails;
