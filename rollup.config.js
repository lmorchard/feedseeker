import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const common = {
  plugins: [json(), commonjs(), nodeResolve({ browser: true })],
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
    input: "src/background.js",
    output: {
      file: "build/background.js",
      format: "iife",
    },
  },
  {
    input: "src/contentScript.js",
    output: {
      file: "build/contentScript.js",
      format: "iife",
    },
  },
].map((item) => ({ ...common, ...item }));
