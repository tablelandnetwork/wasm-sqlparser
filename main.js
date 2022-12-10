// @ts-check
import fs from "fs";
import { initSync, __wasm } from "./module.js";

/**
 * @param {BufferSource | Promise<BufferSource>} [input]
 * @returns {Promise<WebAssembly.Exports>}
 */
const init = async (input) => {
  if (typeof input === "undefined") {
    const filePath = new URL("./main.wasm", import.meta.url);
    input = fs.readFileSync(filePath);
  }

  return initSync(await input);
};

export { __wasm, initSync, init };
export default init;
