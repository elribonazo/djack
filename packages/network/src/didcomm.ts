import type * as DIDCommLibTypes from "../didcomm-wasm/didcomm_js";

export async function getDidcommLibInstance(): Promise<typeof DIDCommLibTypes> {
  const DIDCommLib = await import("../didcomm-wasm/didcomm_js");
  const wasmInit = DIDCommLib.default;
  const { default: wasm } = await import("../didcomm-wasm/didcomm_js_bg.wasm");
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await wasmInit(await wasm());
  return DIDCommLib;
}
