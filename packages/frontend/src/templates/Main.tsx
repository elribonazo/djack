/* eslint-disable import/no-webpack-loader-syntax */

import { ReactNode } from 'react';

import HeaderNav from '../components/headerNav';
import { AppConfig } from '../utils/AppConfig';

type IMainProps = {
  children: ReactNode;
};

const Main = (props: IMainProps) => {
  return (
    <div className="leading-normal tracking-normal text-indigo-400 m-0 sm:m-6 bg-cover bg-fixed mt-0">
    <div className="antialiased w-full text-gray-700 px-0 sm:px-4">
      <div className="mx-auto">
        <HeaderNav />
        <div className="py-5 text-white text-xl content bg-gray-900 opacity-75 w-full shadow-lg rounded-br-lg rounder-bl-lg px-8 pt-6 pb-8 mb-4">
          {props.children}
        </div>
        <div className="text-center text-sm">
          <div className="pt-5 text-xl content bg-gray-900 opacity-75 w-full shadow-lg rounded-lg px-8 pb-8">
            © Copyright {new Date().getFullYear()} {AppConfig.title}. Powered
            with{' '}
            <span role="img" aria-label="Love">
              ♥
            </span>{' '}
            by{' '}
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
    </div>
    </div>
  );
};

export { Main };
