import * as esbuild from "esbuild"
import watPlugin from "esbuild-plugin-wat";

// esm
await esbuild.build({
  // default platform is browser
  entryPoints: ["main.js"],
  external: ["fs", "crypto"],
  bundle: true,
  outfile: "esm/out.js",
  plugins: [watPlugin()],
});
