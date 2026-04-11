import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@doktori/db", "@doktori/shared", "@doktori/validation"],
};

export default nextConfig;
