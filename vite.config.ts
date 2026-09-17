import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { devApiPlugin } from "./vite.dev-api-plugin.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && devApiPlugin(mode),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  ssr: {
    external: ["firebase-admin", "firebase-admin/app", "firebase-admin/auth"],
  },
}));
