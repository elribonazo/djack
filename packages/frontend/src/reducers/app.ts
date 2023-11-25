/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  AnoncredsLoader,
  CredentialIssueMessage,
  CredentialOfferMessage,
  Network,
} from "@djack-sdk/network";
import {
  Discovery,
  RequestCredentialOffer,
  DomainVerification,
  AcceptCredentialOffer,
  Email,
} from "../actions/types";
import { v4 as uuidv4 } from "uuid";
import { PeerId } from "@libp2p/interface/peer-id";
import { Message } from "didcomm";
import { Anoncreds } from "@djack-sdk/network/build/typings/Anoncreds";
import { DB, dbCredential, dbEmail } from "../utils/DB";
import { PublicKey } from "@djack-sdk/interfaces";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  cancellTask,
  connectDatabase,
  disconnect,
  dismissError,
  load,
  loadNode,
  removeCredentialOffer,
  removePeer,
  requestCredentialOffer,
  unCurrentNode,
  verifyDID,
  walletConnect,
} from "../actions";
import { Nullable } from "../utils/types";

class TraceableError extends Error {
  public id = uuidv4();
  static fromError(err: Error) {
    return new TraceableError(err.message);
  }
}

export type PeerRecord = {
  id: PeerId;
  verified: boolean;
  isVerifying: boolean;
  hasVerified: boolean;
  offer: Nullable<Message>;
  isRequestingOffer: boolean;
  hasRequestedOffer: boolean;
  hasSignedOffer: boolean;
  requestedSignature: Nullable<string>;
  credential: Nullable<Message>;
  hasRequestedCredential: boolean;
  isRequestingCredential: boolean;
  linkSecret: Nullable<string>;
  credentialId: Nullable<number>;
  request: Nullable<
    [Anoncreds.CredentialRequest, Anoncreds.CredentialRequestMeta]
  >;
};

export type DJACKSession = {
  publicKeys: PublicKey[];
};

export type RootState = {
  emails: dbEmail[];
  errors: TraceableError[];
  loaded: Nullable<{
    anoncreds: AnoncredsLoader;
    didcomm: typeof import("didcomm");
  }>;
  db: Nullable<DB>;
  hasDBConnected: boolean;
  isDBConnecting: boolean;
  walletConnected: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  node: Nullable<Network>;
  name: Nullable<string>;
  isNodeLoading: boolean;
  hasNodeLoaded: boolean;
  isDiscovering: boolean;
  hasDiscovered: boolean;
  peers: PeerRecord[];
  session: DJACKSession;
};

export type RootAction = {
  type: string;
  payload: any;
};

export const initialState: RootState = {
  emails: [] as dbEmail[],
  node: null,
  isNodeLoading: false,
  hasNodeLoaded: false,
  loaded: null,
  isLoading: false,
  hasLoaded: false,
  errors: [] as TraceableError[],
  isDiscovering: false,
  hasDiscovered: false,
  walletConnected: false,
  db: null,
  hasDBConnected: false,
  isDBConnecting: false,
  name: null,
  peers: [] as PeerRecord[],
  session: {
    publicKeys: [] as PublicKey[],
  },
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    ["error"]: (state, action: PayloadAction<Error>) => {
      state.errors.push(TraceableError.fromError(action.payload));
    },
    [AcceptCredentialOffer.ongoing]: (
      state,
      action: PayloadAction<{ offer: Message }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (
          peer.offer &&
          peer.offer.as_value().id === action.payload.offer.as_value().id
        ) {
          peer.isRequestingCredential = true;
          peer.hasRequestedCredential = false;
          peer.credential = null;
        }
        return peer;
      });
    },
    [AcceptCredentialOffer.signaturePending]: (
      state,
      action: PayloadAction<{
        offer: Message;
        requestedSignature: string;
        peer: PeerId;
      }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.peer.toString()) {
          peer.offer = action.payload.offer;
          peer.requestedSignature = action.payload.requestedSignature;
          peer.hasSignedOffer = false;
        }
        return peer;
      });
    },
    [AcceptCredentialOffer.success]: (
      state,
      action: PayloadAction<{
        offer: Message;
        credential: any;
        linkSecret: any;
        request: any;
      }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (
          peer.offer &&
          peer.offer.as_value().id === action.payload.offer.as_value().id
        ) {
          peer.isRequestingCredential = false;
          peer.hasRequestedCredential = true;
          peer.credential = action.payload.credential;
          peer.linkSecret = action.payload.linkSecret;
          peer.request = action.payload.request;
          peer.hasSignedOffer = true;
        }
        return peer;
      });
    },
    [AcceptCredentialOffer.remove]: (
      state,
      action: PayloadAction<{ offer: Message }>
    ) => {
      state.peers = state.peers.filter((peer) => {
        if (
          peer.offer &&
          peer.offer.as_value().id === action.payload.offer.as_value().id
        ) {
          return false;
        }
        return true;
      });
    },
    [AcceptCredentialOffer.failure]: (
      state,
      action: PayloadAction<{ offer: Message; error: Error }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (
          peer.offer &&
          peer.offer.as_value().id === action.payload.offer.as_value().id
        ) {
          peer.isRequestingCredential = false;
          peer.hasRequestedCredential = false;
          peer.credential = null;
        }
        return peer;
      });
      state.errors = [
        ...state.errors,
        TraceableError.fromError(action.payload.error),
      ];
    },
    [RequestCredentialOffer.ongoing]: (
      state,
      action: PayloadAction<{ peer: PeerId }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.peer.toString()) {
          peer.isRequestingOffer = true;
          peer.hasRequestedOffer = false;
          peer.offer = null;
        }
        return peer;
      });
    },
    [RequestCredentialOffer.remove]: (
      state,
      action: PayloadAction<{ offer: Message }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (
          peer.offer &&
          peer.offer.as_value().id === action.payload.offer.as_value().id
        ) {
          peer.isRequestingOffer = false;
          peer.hasRequestedOffer = false;
          peer.offer = null;
        }
        return peer;
      });
    },
    [RequestCredentialOffer.success]: (
      state,
      action: PayloadAction<{ peer: PeerId; offer: Message }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.peer.toString()) {
          peer.isRequestingOffer = false;
          peer.hasRequestedOffer = true;
          peer.offer = action.payload.offer;
        }
        return peer;
      });
    },
    [RequestCredentialOffer.failure]: (
      state,
      action: PayloadAction<{ peer: PeerId; error: Error }>
    ) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.peer.toString()) {
          peer.isRequestingOffer = false;
          peer.hasRequestedOffer = false;
          peer.offer = null;
        }
        return peer;
      });
      state.errors = [
        ...state.errors,
        TraceableError.fromError(action.payload.error),
      ];
    },
    [DomainVerification.ongoing]: (state, action: PayloadAction<PeerId>) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.toString()) {
          peer.isVerifying = true;
          peer.hasVerified = false;
        }
        return peer;
      });
    },
    [DomainVerification.success]: (state, action: PayloadAction<PeerId>) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.toString()) {
          peer.isVerifying = false;
          peer.hasVerified = true;
          peer.verified = true;
        }
        return peer;
      });
    },
    [DomainVerification.failure]: (state, action: PayloadAction<Error>) => {
      state.errors = [
        ...state.errors,
        TraceableError.fromError(action.payload),
      ];
    },
    [Email.success]: (state, action: PayloadAction<dbEmail>) => {
      if (!state.emails.find((email) => email.id === action.payload.id)) {
        state.emails = [...state.emails, action.payload];
      }
    },
    [Discovery.ongoing]: (state, action: PayloadAction<PeerId>) => {
      state.isDiscovering = true;
      state.hasDiscovered = false;
      if (
        !state.peers.find(
          (peer) => peer.id.toString() !== action.payload.toString()
        )
      ) {
        state.peers = [
          ...state.peers.filter(
            (peer) => peer.id.toString() !== action.payload.toString()
          ),
          {
            id: action.payload,
            verified: false,
            isVerifying: false,
            hasVerified: false,
            hasRequestedOffer: false,
            isRequestingOffer: false,
            offer: null,
            credential: null,
            hasRequestedCredential: false,
            isRequestingCredential: false,
            linkSecret: null,
            request: null,
            hasSignedOffer: false,
            requestedSignature: null,
            credentialId: null,
          },
        ];
      }
    },
    [Discovery.success]: (state, action: PayloadAction<PeerId>) => {
      state.isDiscovering = false;
      state.hasDiscovered = true;
      if (
        !state.peers.find(
          (peer) => peer.id.toString() !== action.payload.toString()
        )
      ) {
        state.peers = [
          ...state.peers.filter(
            (peer) => peer.id.toString() !== action.payload.toString()
          ),
          {
            id: action.payload,
            verified: false,
            isVerifying: false,
            hasVerified: false,
            hasRequestedOffer: false,
            isRequestingOffer: false,
            offer: null,
            credential: null,
            hasRequestedCredential: false,
            isRequestingCredential: false,
            linkSecret: null,
            request: null,
            hasSignedOffer: false,
            requestedSignature: null,
            credentialId: null,
          },
        ];
      }
    },
    [Discovery.update]: (
      state,
      action: PayloadAction<{
        peerId: PeerId;
        didcomm: typeof import("didcomm");
        anoncreds: AnoncredsLoader;
        offerMessage?: CredentialOfferMessage;
        credentialMessage?: CredentialIssueMessage;
        dbCredential: dbCredential;
      }>
    ) => {
      state.peers = state.peers.map((peerRecord) => {
        if (peerRecord.id.toString() === action.payload.peerId.toString()) {
          const { linkSecret, id } = action.payload.dbCredential;

          if (id) {
            peerRecord.credentialId = id;
          }

          if (linkSecret) {
            peerRecord.linkSecret = linkSecret;
          }

          if (action.payload.offerMessage) {
            peerRecord.hasRequestedOffer = true;
            peerRecord.isRequestingOffer = false;
            peerRecord.offer = action.payload.offerMessage.message;
          }

          if (action.payload.credentialMessage) {
            peerRecord.hasRequestedCredential = true;
            peerRecord.isRequestingCredential = false;
            peerRecord.credential = action.payload.credentialMessage.message;
          }
        }

        return peerRecord;
      });
    },
    [Discovery.failure]: (state, action: PayloadAction<Error>) => {
      state.isDiscovering = false;
      state.hasDiscovered = false;
      state.errors.push(TraceableError.fromError(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder.addCase(verifyDID.fulfilled, (state, action) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.payload.peer.toString()) {
          peer.isVerifying = false;
          peer.hasVerified = true;
        }
        return peer;
      });
    });
    builder.addCase(unCurrentNode.fulfilled, (_state, action) => {
      return action.payload;
    });
    builder.addCase(unCurrentNode.rejected, () => {
      return initialState;
    });
    builder.addCase(connectDatabase.fulfilled, (state, action) => {
      state.hasDBConnected = true;
      state.isDBConnecting = false;
      state.db = action.payload;
    });
    builder.addCase(connectDatabase.rejected, (state, action) => {
      state.errors.push(TraceableError.fromError(action.payload as Error));
      state.hasDBConnected = true;
      state.isDBConnecting = false;
      state.db = null;
    });
    builder.addCase(connectDatabase.pending, (state) => {
      state.hasDBConnected = false;
      state.isDBConnecting = true;
    });
    builder.addCase(loadNode.pending, (state, action) => {
      state.name = action.meta.arg.name;
      state.isNodeLoading = true;
      state.hasNodeLoaded = false;
    });
    builder.addCase(loadNode.rejected, (state, action) => {
      state.errors.push(TraceableError.fromError(action.payload as Error));
      state.isNodeLoading = false;
      state.hasNodeLoaded = false;
    });
    builder.addCase(loadNode.fulfilled, (state, action) => {
      state.isNodeLoading = false;
      state.hasNodeLoaded = true;
      state.node = action.payload.node;
      state.db = action.payload.db;
      state.hasDBConnected = true;
    });
    builder.addCase(walletConnect.fulfilled, (state, action) => {
      state.session.publicKeys = action.payload;
      state.walletConnected = true;
    });
    builder.addCase(load.rejected, (state, action) => {
      state.errors.push(TraceableError.fromError(action.payload as Error));
      state.isLoading = false;
      state.hasLoaded = false;
    });
    builder.addCase(load.pending, (state) => {
      state.isLoading = true;
      state.hasLoaded = false;
    });
    builder.addCase(load.fulfilled, (state, action) => {
      state.loaded = action.payload;
      state.hasLoaded = true;
      state.isLoading = false;
    });

    builder.addCase(cancellTask.fulfilled, () => {
      return initialState;
    });

    builder.addCase(removePeer.fulfilled, (state, action) => {
      state.peers = state.peers.filter(
        (peer) => peer.id.toString() !== action.payload.toString()
      );
    });

    builder.addCase(disconnect.fulfilled, () => {
      return initialState;
    });

    builder.addCase(dismissError.fulfilled, (state, action) => {
      const errorIndex = state.errors.findIndex(
        (value) => value.id === action.payload
      );
      if (errorIndex > -1) {
        state.errors.splice(errorIndex, 1);
      }
    });

    builder.addCase(removeCredentialOffer.fulfilled, (state, action) => {
      state.peers = state.peers.map((peer) => {
        if (
          peer.offer &&
          peer.offer.as_value().id === action.payload.offer.as_value().id
        ) {
          peer.isRequestingOffer = false;
          peer.hasRequestedOffer = false;
          peer.offer = null;
        }
        return peer;
      });
    });
    builder.addCase(requestCredentialOffer.pending, (state, action) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.meta.arg.peer.toString()) {
          peer.isRequestingCredential = true;
          peer.hasRequestedCredential = false;
        }
        return peer;
      });
    });
    builder.addCase(requestCredentialOffer.fulfilled, (state, action) => {
      state.peers = state.peers.map((peer) => {
        if (peer.id.toString() === action.meta.arg.peer.toString()) {
          peer.request = action.payload.request;
          peer.credential = action.payload.credential;
          peer.offer = action.payload.offer;
          peer.hasRequestedCredential = true;
          peer.hasRequestedOffer = true;
          peer.hasSignedOffer = true;
          peer.isRequestingCredential = false;
          peer.isRequestingOffer = false;
        }
        return peer;
      });
    });
  },
});

export default appSlice.reducer;
export const reduxActions = appSlice.actions;
