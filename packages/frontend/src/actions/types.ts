export enum Loading {
  success = "loadingSuccess",
  failure = "loadingFailure",
  ongoing = "loadingOngoing",
}

export enum NodeLoading {
  success = "nodeLoadingSuccess",
  failure = "nodeLoadingFailure",
  ongoing = "nodeLoadingOngoing",
}

export enum Discovery {
  success = "discoverySuccess",
  failure = "discoveryFailure",
  ongoing = "discoveryOngoing",
  remove = "discoveryRemove",
  update = "discoveryUpdate",
}

export enum RequestCredentialOffer {
  success = "requestCredentialOfferSuccess",
  failure = "requestCredentialOfferFailure",
  ongoing = "requestCredentialOfferOngoing",
  remove = "requestCredentialOfferRemove",
}

export enum AcceptCredentialOffer {
  success = "acceptCredentialOfferSuccess",
  failure = "acceptCredentialOfferFailure",
  ongoing = "acceptCredentialOfferOngoing",
  remove = "acceptCredentialOfferRemove",
  signaturePending = "acceptCredentialSignaturePending",
  signatureReady = "acceptCredentialSignatureReady",
}

export enum DomainVerification {
  success = "domainVerificationSuccess",
  failure = "domainVerificationFailure",
  ongoing = "domainVerificationOngoing",
}

export enum Email {
  success = "emailSuccess",
  dbRestore = "emailDBRestore",
}

export enum WalletConnect {
  success = "walletConnectSuccess",
}
