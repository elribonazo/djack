import { Buffer } from "buffer/index.js";
import ed25519 from "@stablelib/ed25519";
import {
  Curve,
  KeyProperties,
  AbstractSigningKey,
  PrivateKey,
} from "@djack-sdk/interfaces";

import { Ed25519PublicKey } from "./PublicKey.js";

export class Ed25519PrivateKey
  extends PrivateKey
  implements AbstractSigningKey {
  public type: Curve = Curve.ED25519;

  constructor(
    public raw: Uint8Array,
    public options: Map<KeyProperties, string> = new Map()
  ) {
    super();

    this.setOption(KeyProperties.curve, Curve.ED25519);
  }

  get public() {
    const rawPublic = ed25519.extractPublicKeyFromSecretKey(this.raw);
    return new Ed25519PublicKey(rawPublic);
  }

  sign(message: Buffer): Buffer {
    return Buffer.from(ed25519.sign(this.raw, message));
  }
}
