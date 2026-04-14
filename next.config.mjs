/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      "better-sqlite3",
      "sqlite-vss",
      "pdf-parse",
      "chokidar",
      "fsevents",
    ],
  },
};

export default nextConfig;
