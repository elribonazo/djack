import { Buffer } from "buffer/index.js";
import ed25519 from "@stablelib/ed25519";

import type { AbstractVerifyingKey } from "@djack-sdk/interfaces";
import { PublicKey, Curve, KeyProperties } from "@djack-sdk/interfaces";

export class Ed25519PublicKey
  extends PublicKey
  implements AbstractVerifyingKey {
  public type: Curve = Curve.ED25519;
  constructor(
    public raw: Uint8Array,
    public options: Map<KeyProperties, string> = new Map()
  ) {
    super();
    this.setOption(KeyProperties.curve, Curve.ED25519);
  }

  verify(message: Buffer, signature: Buffer): boolean {
    return ed25519.verify(this.raw, message, signature);
  }
}
