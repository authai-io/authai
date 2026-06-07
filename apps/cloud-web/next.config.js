/** @type {import('next').NextConfig} */
const nextConfig = {
  // The webapp lives at cloud.authai.dev. The relay lives at
  // relay.authai.dev. They share Postgres but otherwise know nothing
  // about each other.
  reactStrictMode: true,
  // pg native bindings aren't bundle-able by Webpack — keep external.
  serverExternalPackages: ["pg", "pg-native"],
  // Workspace packages publish TypeScript source. Tell Next.js to
  // transpile them through SWC so `.js`-suffixed ESM imports resolve.
  transpilePackages: [
    "@authai/cloud",
    "@authai/relay",
    "@authai/relay-store-postgres",
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
