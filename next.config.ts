import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
  outputFileTracingRoot: path.join(__dirname),
  compiler: {
    styledComponents: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@sanity/icons",
      "@sanity/ui",
      "sanity",
      "@sanity/vision",
    ],
  },
};

export default nextConfig;
