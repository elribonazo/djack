import { PrivateKey, Curve, KeyProperties } from "@djack-sdk/interfaces";
import { X25519PublicKey } from "./PublicKey.js";

import x25519 from "@stablelib/x25519";

export class X25519PrivateKey extends PrivateKey {
  public type: Curve = Curve.X25519;

  constructor(
    public raw: Uint8Array,
    public options: Map<KeyProperties, string> = new Map()
  ) {
    super();
    this.setOption(KeyProperties.curve, Curve.X25519);
  }

  get public(): X25519PublicKey {
    return new X25519PublicKey(x25519.scalarMultBase(this.raw));
  }
}
