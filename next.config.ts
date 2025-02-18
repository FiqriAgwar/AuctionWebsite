/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.alicdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      // Add other common image hosting services as needed
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
