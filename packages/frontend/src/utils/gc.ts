import JSONURL from "json-url";

// type GC_RUNABLES = Partial<{
//   get_addresses: {
//     type: string;
//     filter: { kind: "base" };
//   };
//   get_public: any;
// }>;

export type GC_SCRIPT = {
  type: string;
  title: string;
  description: string;
  exportAs: string;
  run: any;
  returnURLPattern: string;
};

async function compress(script: GC_SCRIPT) {
  return JSONURL("lzma").compress(script);
}

export async function create(script: GC_SCRIPT) {
  const compressed = await compress(script);
  return `https://beta-wallet.gamechanger.finance/api/2/run/${compressed}`;
}
