// @ts-check
import { readFileSync } from "fs";
import { join } from "path";
import { initSync, __wasm } from "./module.js";

/**
 * @param {BufferSource | Promise<BufferSource>} [input]
 * @returns {Promise<WebAssembly.Exports>}
 */
const init = async (input) => {
  if (typeof input === "undefined") {
    const wasmPath = typeof __dirname === "undefined"
      // in esm build path can be relative
      ? (new URL("./main.wasm", import.meta.url)).pathname
      // in cjs build path must be full
      : join(__dirname, "main.wasm");
    input = readFileSync(wasmPath);
  }

  return initSync(await input);
};

export { __wasm, initSync, init };
export default init;
