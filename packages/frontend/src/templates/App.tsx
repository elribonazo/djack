/* eslint-disable import/no-webpack-loader-syntax */

import { ReactNode } from "react";
import {WalletConnect} from "../components/WalletConnect";

import { AppConfig } from "../utils/AppConfig";
import StateIndicator from "../components/StateIndicator";

type IMainProps = {
  children: ReactNode;
  abort: AbortController;
};

const App = (props: IMainProps) => {
  return (
    <div className="antialiased w-full text-gray-700 min-h-screen flex flex-col ">
      <nav className="bg-gray-900 fixed w-full z-20 top-0 left-0 border-b  border-gray-600">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <button type="button" className="flex items-center">
            <span className="bg-clip-text font-bold text-4xl text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">
              DJack.email - BETA
            </span>
            <StateIndicator />
          </button>
          <div className="flex md:order-2">
            <WalletConnect abort={props.abort} />
          </div>
        </div>
      </nav>
      <div
        style={{ marginTop: 87 }}
        className="text-white text-xl content flex-grow opacity-75 w-full"
      >
        {props.children}
      </div>
      <div className="text-center text-sm">
        <div className="pt-5 text-xl content bg-gray-900 opacity-75 w-full shadow-lg rounded-lg px-8 pb-8">
          © Copyright {new Date().getFullYear()} {AppConfig.title}. Powered with{" "}
          <span role="img" aria-label="Love">
            ♥
          </span>{" "}
          by{" "}
          <a
            target="_blank"
            href="https://github.com/elribonazo"
            rel="noreferrer"
          >
            @elribonazo
          </a>
        </div>
      </div>
    </div>
  );
};

export { App };
