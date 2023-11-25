/* eslint-disable prefer-const */
import { Store } from "redux";
import thunk from "redux-thunk";
import { base64url } from "multiformats/bases/base64";
import { Ed25519PublicKey, X25519PublicKey } from "@djack-sdk/did-peer";
import { createWrapper } from "next-redux-wrapper";
import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";

import rootReducer from "./index";
import { RootState, initialState } from "./app";
import { useMemo } from "react";
import * as actions from "../actions";

let defaultInitState: any = {};
try {
  if (typeof sessionStorage !== "undefined") {
    const sessionKey = sessionStorage.getItem("djack");

    ///When we find a request here, attempt to load what is required in storage and continue
    if (sessionKey) {
      const keysJSON = JSON.parse(Buffer.from(sessionKey, "hex").toString());
      if (keysJSON.name) {
        defaultInitState.name = keysJSON.name;
      }
      if (keysJSON.publicKeys) {
        defaultInitState.session = {
          publicKeys: keysJSON.publicKeys.map((publicKeyJWK) => {
            if (publicKeyJWK.crv === "Ed25519") {
              return new Ed25519PublicKey(base64url.baseDecode(publicKeyJWK.x));
            }
            return new X25519PublicKey(base64url.baseDecode(publicKeyJWK.x));
          }),
        };
      }
    }
  }
} catch (err) {
  console.log(err);
}

export const store = configureStore({
  reducer: rootReducer,
  devTools: false,
  preloadedState: {
    app: {
      ...initialState,
      ...defaultInitState,
    },
  },
  middleware: [thunk],
});

export type AppDispatch = typeof store.dispatch;
export const useAppSelector: TypedUseSelectorHook<{ app: RootState }> =
  useSelector;

export const useMountedApp = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dispatchedActions = useMemo(
    () => bindActionCreators(actions, dispatch),
    [dispatch]
  );
  const state = useAppSelector((state) => state.app);
  return {
    ...state,
    ...dispatchedActions,
  };
};

export const wrapper = createWrapper<Store>(() => store);
