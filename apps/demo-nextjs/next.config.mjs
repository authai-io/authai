/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for the Dokku Dockerfile build — copies a self-contained
  // .next/standalone/ tree the runtime stage runs as `node server.js`.
  output: "standalone",
  // Tells Next.js to trace files across the monorepo root, not just this
  // app dir.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};
export default nextConfig;
