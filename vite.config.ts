import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "FiftyComfy",
      fileName: () => "index.umd.js",
      formats: ["umd"],
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "recoil",
        "@fiftyone/components",
        "@fiftyone/operators",
        "@fiftyone/plugins",
        "@fiftyone/state",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          recoil: "recoil",
          "@fiftyone/components": "__foc__",
          "@fiftyone/operators": "__foo__",
          "@fiftyone/plugins": "__fop__",
          "@fiftyone/state": "__fos__",
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
