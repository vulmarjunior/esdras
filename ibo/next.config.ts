import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // Importação de livros da biblioteca (seções em JSON podem passar de 1 MB).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;