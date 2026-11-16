import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "pdf-lib", "mammoth", "tesseract.js", "@napi-rs/canvas"],
};

export default nextConfig;
