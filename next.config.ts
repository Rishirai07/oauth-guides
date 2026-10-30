import type { NextConfig } from "next";

// cacheComponents is off on purpose: guide pages and the agent stream are
// fully dynamic (live probes, generated guides), and classic segment config
// (runtime / maxDuration / dynamic) keeps that explicit.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
