import { Curve, KeyProperties, PublicKey } from "@djack-sdk/interfaces";

export class X25519PublicKey extends PublicKey {
  public type: Curve = Curve.X25519;

  constructor(
    public raw: Uint8Array,
    public options: Map<KeyProperties, string> = new Map()
  ) {
    super();
    this.setOption(KeyProperties.curve, Curve.X25519);
  }
}
