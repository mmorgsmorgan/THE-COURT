/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "images.weserv.nl" },
      { protocol: "https", hostname: "wsrv.nl" },
    ],
  },
};

module.exports = nextConfig;
