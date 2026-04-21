import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    /** Чтобы с телефона в той же Wi‑Fi можно было открыть сайт по адресу вида http://192.168.x.x:5173 */
    host: true,
    port: 5173,
  },
});
