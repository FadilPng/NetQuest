import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    allowedHosts: ['.e2b.app'],
  },
  plugins: [
    ...(mode === 'editor' ? [{ name: 'editor-entry', configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, _res, next) => { if (req.url === '/' || req.url?.startsWith('/?')) req.url = '/editor.html'; next(); });
    } }] : []),
    react(), tailwindcss(), viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
