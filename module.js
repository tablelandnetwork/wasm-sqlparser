// @ts-check
/* global Go */
import "./wasm_exec.js";

// @ts-ignore
const go = new Go();
// Bit of a hack for this: https://github.com/tinygo-org/tinygo/issues/1140
go.importObject.env["syscall/js.finalizeRef"] = () => {};

/** @type {WebAssembly.Exports | undefined} */
let wasm;

const cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

/**
 * @param {WebAssembly.Module} module
 * @param {WebAssembly.Imports} imports
 * @returns {Promise<any>}
 */
async function load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") !== "application/wasm") {
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            e
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}

/**
 * @returns {WebAssembly.Imports}
 */
function getImports() {
  return go.importObject;
}

/**
 * @param {WebAssembly.Imports} imports
 * @param {WebAssembly.Memory} [maybeMemory]
 */
function initMemory(imports, maybeMemory) {}

/**
 * @param {WebAssembly.Instance} instance
 * @param {WebAssembly.Module} module
 * @returns {WebAssembly.Exports}
 */
function finalizeInit(instance, module) {
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  // cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);

  return wasm;
}

/**
 * @param {BufferSource} bytes
 * @returns {WebAssembly.Exports}
 */
const initSync = (bytes) => {
  const imports = getImports();

  initMemory(imports);

  const module = new WebAssembly.Module(bytes);
  const instance = new WebAssembly.Instance(module, imports);

  go.run(instance);

  return finalizeInit(instance, module);
};

/** @typedef {Promise<T> | T} PromiseOrValue<T> @template T */

/**
 * @typedef {{ __wbindgen_wasm_module?: WebAssembly.Module, (
 * input?: PromiseOrValue<string | Response | URL | BufferSource>
 * ): Promise<WebAssembly.Exports> }} InitFunction
 */

/**
 * @type {InitFunction}
 * @param {PromiseOrValue<string | Response | URL | BufferSource>} [input]
 * @returns {Promise<WebAssembly.Exports>}
 */
const init = async (input) => {
  if (typeof input === "undefined") {
    // NOTE: using `import.meta` like this does not work in cjs.
    //       However this works in general aside from a warning during build.
    //       This is because the value of input is always undefined in cjs.
    input = new URL("./main.wasm", import.meta.url);
  }
  const imports = getImports();

  if (
    typeof input === "string" ||
    (typeof Request === "function" && input instanceof Request) ||
    (typeof URL === "function" && input instanceof URL)
  ) {
    input = fetch(input);
  }

  initMemory(imports);

  const { instance, module } = await load(await input, imports);

  go.run(instance);

  return finalizeInit(instance, module);
};

export { wasm as __wasm, initSync, init };
export default init;
