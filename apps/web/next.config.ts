import type { NextConfig } from "next";
// @ts-expect-error next-pwa has no types
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  transpilePackages: ["@tawala/core"],
};

const pwaConfig = withPWA({
  dest: "public",
  sw: "sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^\/api\/keto\/meal-plan/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-keto-meal-plan",
        expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^\/api\/spirit\/verse/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-spirit-verse",
        expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^\/api\/finance\/budget/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-finance-budget",
        expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^\/api\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-routes",
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
      },
    },
  ],
  additionalManifestEntries: [
    { url: "/api/keto/meal-plan", revision: null },
    { url: "/api/spirit/verse", revision: null },
    { url: "/api/finance/budget", revision: null },
  ],
})(nextConfig);

export default pwaConfig;
