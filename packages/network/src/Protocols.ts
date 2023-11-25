import { v4 as uuidv4 } from "uuid";

import type { Attachment, IMessage } from "didcomm";
import {
  PROTOCOLS,
  fromDIDCOMMType,
  toDIDCOMMType,
} from "@djack-sdk/interfaces";
import { getDidcommLibInstance } from "./didcomm";

const didcommPKG =
  typeof window !== "undefined"
    ? await getDidcommLibInstance()
    : await import("didcomm-node");

abstract class BaseMessage implements Partial<IMessage> {
  public id = uuidv4();
  public typ = "application/didcomm-plain+json";
  public from: string;
  public to: string[];

  public body: any = {};
  public thid: string = uuidv4();
  public attachments: Attachment[] = [];

  public pthid?: string | undefined;
  public created_time?: number | undefined;
  public expires_time?: number | undefined;
  public from_prior?: string | undefined;
  abstract type: PROTOCOLS;

  constructor(data: Partial<IMessage>) {
    if (!data.from) {
      throw new Error("From is required");
    }

    if (!data.to) {
      throw new Error("To is required");
    }

    this.to = data.to;
    this.from = data.from;

    this.body = data.body || {};
    this.attachments = data.attachments || [];

    this.pthid = data.pthid;
    this.created_time = data.created_time;
    this.expires_time = data.expires_time;
    this.from_prior = data.from_prior;
  }

  get message() {
    return new didcommPKG.Message(this);
  }

  is<T extends PROTOCOLS>(type: string | undefined): type is T {
    return !type ? false : type in PROTOCOLS;
  }
}

export class ProtocolMessage extends BaseMessage {
  public type!: any;

  constructor(data: Partial<IMessage>) {
    super(data);
    if (this.is<PROTOCOLS>(data.type)) {
      this.type = data.type;
    }
  }
}

export class ExchangeAuthenticateMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.emailExchangeAuthenticate);

  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<ExchangeAuthenticateMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new ExchangeAuthenticateMessage(json);
  }
}

export class CredentialOfferRequestMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.credentialOfferRequest);

  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<CredentialOfferRequestMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new CredentialOfferRequestMessage(json);
  }

  respond(message: Partial<IMessage>): CredentialOfferMessage {
    console.log(`Answering to offer ${this.thid}`);
    return new CredentialOfferMessage({
      ...message,
      thid: this.thid,
    });
  }
}

export class CredentialOfferMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.credentialOffer);

  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<CredentialOfferMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new CredentialOfferMessage(json);
  }
}

export class ExchangePresentationMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.emailExchangePresentation);
  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<ExchangePresentationMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new ExchangePresentationMessage(json);
  }
}

export class ExchangeRequestPresentationMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.emailExchangePresentationRequest);
  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<ExchangeRequestPresentationMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new ExchangeRequestPresentationMessage(json);
  }
}

export class CredentialRequestMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.credentialRequest);
  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<CredentialRequestMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new CredentialRequestMessage(json);
  }
}

export class CredentialIssueMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.credentialIssue);
  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<CredentialIssueMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new CredentialIssueMessage(json);
  }
}

export class ExchangeDeliveryMessage extends ProtocolMessage {
  public type = toDIDCOMMType(PROTOCOLS.emailExchangeDelivery);
  static async fromJSON(
    json: Partial<IMessage>
  ): Promise<ExchangeDeliveryMessage> {
    json.type && fromDIDCOMMType(json.type);
    return new ExchangeDeliveryMessage(json);
  }
}
