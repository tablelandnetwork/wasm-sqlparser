// @ts-check
import { readFileSync } from "fs";
import { initSync, __wasm } from "./module.js";

/**
 * @param {BufferSource | Promise<BufferSource>} [input]
 * @returns {Promise<WebAssembly.Exports>}
 */
const init = async (input) => {
  if (typeof input === "undefined") {
    input = readFileSync("./main.wasm");
  }

  return initSync(await input);
};

export { __wasm, initSync, init };
export default init;
