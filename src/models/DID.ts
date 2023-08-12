export interface VerificationMethodTypePeerDID {
  value: string;
}

export enum VerificationMaterialFormatPeerDID {
  JWK = "jwk",
}
export interface VerificationMethodTypePeerDID {
  value: string;
}

export class VerificationMethodType implements VerificationMethodTypePeerDID {
  constructor(public value: string) {}
}
export class VerificationMethodTypeAuthentication extends VerificationMethodType {
  static JSON_WEB_KEY_2020 = new VerificationMethodTypeAuthentication(
    "JsonWebKey2020"
  );
  static ED25519_KEY_AGREEMENT_KEY_2018 =
    new VerificationMethodTypeAuthentication("Ed25519VerificationKey2018");
  static ED25519_KEY_AGREEMENT_KEY_2020 =
    new VerificationMethodTypeAuthentication("Ed25519VerificationKey2020");
}
export interface VerificationMaterialPeerDID {
  keyType: VerificationMethodTypePeerDID;
  value: string;
}
export class VerificationMaterialPeerDIDWithAuthentication
  implements VerificationMaterialPeerDID
{
  constructor(
    public keyType: VerificationMethodTypePeerDID,
    public value: string,
    public authentication: VerificationMaterialAuthentication
  ) {}
}
export class VerificationMaterialAuthentication
  implements VerificationMaterialPeerDIDWithAuthentication
{
  public readonly format: VerificationMaterialFormatPeerDID;
  public readonly value: string;
  public readonly type: VerificationMethodTypeAuthentication;

  constructor(
    value: string,
    type: VerificationMethodTypeAuthentication,
    format: VerificationMaterialFormatPeerDID
  ) {
    this.format = format;
    this.value = value;
    this.type = type;
  }

  get keyType(): VerificationMethodTypePeerDID {
    return this.type;
  }

  get authentication(): VerificationMaterialAuthentication {
    return this;
  }
}

export type VerificationMaterial =
  | VerificationMaterialAuthentication;


export class DID {
  public readonly schema: string;
  public readonly method: string;
  public readonly methodId: string;

  constructor(schema: string, method: string, methodId: string) {
    this.schema = schema;
    this.method = method;
    this.methodId = methodId;
  }

  toString() {
    return `${this.schema}:${this.method}:${this.methodId}`;
  }

  static fromString(text: string): DID {
    const schema = DID.getSchemaFromString(text);
    const method = DID.getMethodFromString(text);
    const methodId = DID.getMethodIdFromString(text);

    if (schema === undefined) {
      throw new Error("Invalid DID string, missing scheme");
    }
    if (method === undefined) {
      throw new Error("Invalid DID string, missing method name");
    }
    if (methodId === undefined) {
      throw new Error("Invalid DID string, missing method ID");
    }

    return new DID(schema, method, methodId);
  }

  static getSchemaFromString(text: string): string | undefined {
    const split = text.split(":");
    return split.at(0);
  }

  static getMethodFromString(text: string): string | undefined {
    const split = text.split(":");
    return split.at(1);
  }

  static getMethodIdFromString(text: string): string {
    const split = text.split(":");
    return split.slice(2).join(":");
  }
}
