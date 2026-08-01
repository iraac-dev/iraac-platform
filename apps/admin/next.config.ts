import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The contract package ships TypeScript source (ESM `.js`-suffixed imports)
  // via its `exports` map. Turbopack must transpile it itself or it resolves
  // "./branching.js" literally and fails to find the `.ts` file.
  transpilePackages: ["@iraac/survey-contract"],
};

export default nextConfig;
