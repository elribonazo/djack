import { wasm } from "@rollup/plugin-wasm";
import nodeResolve from "@rollup/plugin-node-resolve";
import modify from "rollup-plugin-modify";

import Base from "../../../rollup/index.mjs";

export default Base("node", [
  nodeResolve({
    exportConditions: ["node"],
    preferBuiltins: true,
    resolveOnly: ['anoncreds-wasm'],
  }),
  wasm({
    targetEnv: "node",
    fileName: "[name][extname]",
    publicPath: "/",
    // maxFileSize: 10000000
  }),
]);
