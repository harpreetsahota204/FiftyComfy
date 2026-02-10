import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  mode: "development",
  plugins: [
    // Use classic JSX runtime (React.createElement) — required for
    // FiftyOne plugin compatibility. The automatic jsx-runtime import
    // doesn't resolve correctly in FiftyOne's global scope.
    react({ jsxRuntime: "classic" }),
  ],
  build: {
    minify: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@harpreetsahota/fiftycomfy",
      fileName: (format) => `index.${format}.js`,
      formats: ["umd"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "recoil",
        "styled-components",
        "@fiftyone/components",
        "@fiftyone/operators",
        "@fiftyone/plugins",
        "@fiftyone/state",
        "@fiftyone/utilities",
        "@fiftyone/spaces",
        "@fiftyone/aggregations",
        "@fiftyone/core",
        "@mui/material",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsx",
          recoil: "recoil",
          "styled-components": "__styled__",
          "@fiftyone/components": "__foc__",
          "@fiftyone/operators": "__foo__",
          "@fiftyone/plugins": "__fop__",
          "@fiftyone/state": "__fos__",
          "@fiftyone/utilities": "__fou__",
          "@fiftyone/spaces": "__fosp__",
          "@fiftyone/aggregations": "__foa__",
          "@fiftyone/core": "__focore__",
          "@mui/material": "__mui__",
        },
      },
    },
    sourcemap: true,
  },
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  optimizeDeps: {
    exclude: ["react", "react-dom"],
  },
});
