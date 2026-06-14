import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    solidStart({
      ssr: false,
      server: {
        preset: "cloudflare_module",
      },
    }),
    tailwindcss(),
  ],

  server: {
    allowedHosts: ["bippy.tail44eee4.ts.net"],
  },
});
