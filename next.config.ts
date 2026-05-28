import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/rent-vs-buy",
  images: { unoptimized: true },
  reactCompiler: true,
};

export default nextConfig;
