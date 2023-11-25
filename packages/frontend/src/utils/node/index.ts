export enum NetworkStates {
  pendingInitialize = 0,
  initialising = 1,
  disconnected = 2,
  connecting = 3,
  connected = 4,
  discoveryPending = 5,
  discovering = 6,
  verificationPending = 7,
  verifying = 8,
  verified = 9,
  offerPending = 10,
  offering = 11,
  offerCompleted = 12,
  issuePending = 13,
  issuing = 14,
  issued = 15,
  ready = 16,
}

export type InboxState = {
  account: string;
  step: number;
  currentEmail: number;
};

export type EmailsState = {
  from: string;
  to: string;
  subject: string;
  content: string;
  date: string;
};

export type NetworkState = {
  state: NetworkStates;
};
