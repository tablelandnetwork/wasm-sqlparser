/* eslint-disable no-undef */
/* eslint-disable no-unused-expressions */
import { expectType } from "tsd";
import defaultInit, { initSync, __wasm, init } from "@tableland/sqlparser";

expectType<Promise<WebAssembly.Exports>>(defaultInit());

expectType<Promise<WebAssembly.Exports>>(init("blah"));

expectType<WebAssembly.Exports>(initSync(new Uint8Array([1, 2, 3])));

expectType<WebAssembly.Exports | undefined>(__wasm);

expectType<Promise<Array<string>>>(
  globalThis.sqlparser.normalize("select * from table where id = 1;")
);
