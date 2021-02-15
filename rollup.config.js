import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const common = {
  plugins: [
    alias({
      entries: [
        { find: "react", replacement: "preact/compat" },
        { find: "react-dom/test-utils", replacement: "preact/test-utils" },
        { find: "react-dom", replacement: "preact/compat" },
      ],
    }),
    json(),
    commonjs(),
    nodeResolve({ browser: true }),
  ],
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
