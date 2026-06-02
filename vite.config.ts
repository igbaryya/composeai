import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Monolithic project layout:
 *   - package/  → publishable library (composeai)
 *   - demo/     → consumer app, imports the package via its npm name
 *
 * The alias makes `composeai` resolve to the package source so the
 * demo behaves identically to a real npm install while staying in-repo.
 */
export default defineConfig({
  // For GitHub Pages: set BASE_URL env var to /<repo-name>/
  // Locally this defaults to '/' (root)
  base: process.env.BASE_URL || "/",
  plugins: [react()],
  root: path.resolve(__dirname, "demo"),
  resolve: {
    alias: {
      "composeai/composer.css": path.resolve(
        __dirname,
        "package/src/composer.css",
      ),
      "composeai": path.resolve(__dirname, "package/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    fs: {
      // Allow Vite to serve files from the package/ folder too.
      allow: [path.resolve(__dirname, ".")],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});