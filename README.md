# `wasm-sqlparser`

> WIP WASM build of Tableland's [sqlparser](https://github.com/tablelandnetwork/sqlparser)

## Install build tools

I use the Rust [`https` package](https://crates.io/crates/https) because it handles the correct MIME types for
served files.

```
brew tap tinygo-org/tools
brew install tinygo

cargo install https
```

## Bootstrap with wasm helper functions

Use the corresponding tinygo version

```
wget https://raw.githubusercontent.com/tinygo-org/tinygo/v0.23.0/targets/wasm_exec.js
```

## Build with tinygo

```
tinygo build -gc=leaking -no-debug -o main.wasm -target wasm ./main.go
```

This will produce `main.wasm`, and should be no more than 425K in size.

## Serve folder as web-app

You can use whatever file server you want here, just make sure the wasm file is served as `application/wasm`.

```
httplz
```
