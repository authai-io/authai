/** @type {import('next').NextConfig} */
const nextConfig = {
  // The webapp lives at authai.io (+ www.authai.io). The relay lives at
  // relay.authai.io. They share Postgres but otherwise know nothing
  // about each other. Both deploy via Dokku on the same Hetzner box.
  reactStrictMode: true,
  // `output: 'standalone'` produces a minimal Node runnable in
  // .next/standalone — used by the production Dockerfile to ship a tiny
  // runtime image (~150MB vs ~500MB for a full node_modules install).
  output: "standalone",
  // pg native bindings aren't bundle-able by Webpack — keep external.
  serverExternalPackages: ["pg", "pg-native"],
  // Workspace packages publish TypeScript source. Tell Next.js to
  // transpile them through SWC so `.js`-suffixed ESM imports resolve.
  transpilePackages: [
    "@authai-io/cloud",
    "@authai-io/relay",
    "@authai-io/relay-store-postgres",
  ],
  // Workspace packages use ESM-flavored `.js` imports against `.ts`
  // source files. Tell Webpack to fall back to the TS extension when
  // a `.js` import can't find a real `.js` file.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

module.exports = nextConfig;
