import "./wasm_exec.js";

// eslint-disable-next-line no-undef
const go = new Go();
// Bit of a hack for this: https://github.com/tinygo-org/tinygo/issues/1140
go.importObject.env["syscall/js.finalizeRef"] = () => {};
let wasm;

const cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

// let cachedUint8Memory0;
// function getUint8Memory0() {
//   if (cachedUint8Memory0.byteLength === 0) {
//     cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
//   }
//   return cachedUint8Memory0;
// }

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

function getImports() {
  return go.importObject;
}

function initMemory(imports, maybeMemory) {}

function finalizeInit(instance, module) {
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  // cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);

  return wasm;
}

function initSync(bytes) {
  const imports = getImports();

  initMemory(imports);

  const module = new WebAssembly.Module(bytes);
  const instance = new WebAssembly.Instance(module, imports);

  go.run(instance);

  return finalizeInit(instance, module);
}

async function init(input) {
  if (typeof input === "undefined") {
    input = new URL("main.wasm", import.meta.url);
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
}

export { wasm as __wasm, initSync };
export default init;
