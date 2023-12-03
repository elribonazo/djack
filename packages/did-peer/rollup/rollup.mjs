import Base from "../../../rollup/index.mjs";
import nodeResolve from "@rollup/plugin-node-resolve";

export default Base(null, [
    // nodeResolve({
    //     browser: false,
    //     resolveOnly: ["@atala/prism-wallet-sdk"],
    // }),
]);
