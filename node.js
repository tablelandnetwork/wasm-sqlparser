import fs from "fs";
import { initSync, __wasm } from "./main.js";

async function init(input) {
  if (typeof input === "undefined") {
    input = fs.readFileSync("./main.wasm");
  }

  return initSync(input);
}

export default init;
export { __wasm, initSync };
