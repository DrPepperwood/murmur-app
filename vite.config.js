import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vite only exposes env vars to the frontend if their name starts with
  // one of these prefixes. VITE_ is the default; GIPHY_ is added because
  // Vercel's dashboard flags VITE_GIPHY_API_KEY as "public" and won't let
  // you save it under that name — GIPHY_API_KEY (no VITE_ prefix) is the
  // workaround, and this line is what makes Vite still expose it to the
  // browser despite not starting with VITE_.
  envPrefix: ["VITE_", "GIPHY_"],
});
