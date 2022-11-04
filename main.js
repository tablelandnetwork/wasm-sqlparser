import fs from "fs";
import { initSync, __wasm } from "./module.js";

async function init(input) {
  if (typeof input === "undefined") {
    const filePath = new URL('./main.wasm', import.meta.url);
    input = fs.readFileSync(filePath);
  }

  return initSync(input);
}

export { __wasm, initSync, init };
export default init;
