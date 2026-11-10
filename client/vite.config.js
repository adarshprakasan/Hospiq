import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: "hospiq-content-security-policy",
    apply: "build",
    transformIndexHtml() {
      const env = loadEnv(mode, process.cwd(), "VITE_");
      const api = new URL(env.VITE_API_URL || "http://localhost:5000/api", "https://hospiq.invalid");
      if (!["http:", "https:"].includes(api.protocol) || api.username || api.password) throw new Error("VITE_API_URL must be an HTTP(S) or relative URL");
      const apiSource = api.origin === "https://hospiq.invalid" ? "" : ` ${api.origin}`;
      const policy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        `connect-src 'self'${apiSource}`,
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ].join("; ");
      return [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" }];
    },
  }],
}));
