import { nodeResolve } from "@rollup/plugin-node-resolve";

const common = {
  plugins: [nodeResolve({ browser: true })],
};

export default [
  {
    input: "src/app/index.js",
    output: {
      file: "build/app/index.js",
      format: "iife",
    },
  },
  {
    input: "src/background/index.js",
    output: {
      file: "build/background.js",
      format: "iife",
    },
  },
  {
    input: "src/contentScript/index.js",
    output: {
      file: "build/contentScript.js",
      format: "iife",
    },
  },
].map((item) => ({ ...common, ...item }));
