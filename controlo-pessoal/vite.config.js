import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:artifact` gera um único HTML (JS e CSS inline) para
// publicar como artifact do Claude; o build normal continua igual.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "artifact" ? [viteSingleFile()] : [])],
  build: mode === "artifact" ? { outDir: "dist-artifact", chunkSizeWarningLimit: 2000 } : {},
}));
