import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /* Split the framework out of the app bundle. Everything used to ship
           as one ~504 kB chunk, which tripped Rollup's 500 kB warning on every
           deploy. The practical win is caching, not size: React and the router
           change only when they're upgraded, so a copy edit no longer forces
           returning visitors to re-download them. */
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
