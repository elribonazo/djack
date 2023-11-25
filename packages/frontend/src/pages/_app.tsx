import { FC } from "react";
import { AppProps } from "next/app";
import { Provider } from "react-redux";

import { wrapper } from "../reducers/store";

import "../styles/main.css";

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  const { store, props } = wrapper.useWrappedStore(pageProps);
  return (
    <Provider store={store}>
      <Component {...props} />
    </Provider>
  );
};
export default MyApp;
