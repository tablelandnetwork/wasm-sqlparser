#!/usr/bin/env node

import * as esbuild from 'esbuild'
import watPlugin from 'esbuild-plugin-wat';

await esbuild.build({
  platform: 'node',
  entryPoints: ['main.js'],
  bundle: true,
  outfile: 'cjs/out.cjs',
  plugins: [watPlugin()],
})