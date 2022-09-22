import fs from "fs";
import { initSync, __wasm } from "./types/index.js";

async function init(input) {
  if (typeof input === "undefined") {
    input = fs.readFileSync("./main.wasm");
  }

  return initSync(input);
}

export { __wasm, initSync, init };
export default init;
