// Wrangler hands these over as compiled WebAssembly and raw bytes (the
// [[rules]] in ../wrangler.toml); TypeScript has to be told so.

declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}

declare module '*.woff' {
  const data: ArrayBuffer;
  export default data;
}

declare module '*.jpg' {
  const data: ArrayBuffer;
  export default data;
}

declare module '*.png' {
  const data: ArrayBuffer;
  export default data;
}
