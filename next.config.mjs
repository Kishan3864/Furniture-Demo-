/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export -> served by Firebase Hosting (see firebase.json for rewrites + headers)
  output: 'export',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};

export default nextConfig;
