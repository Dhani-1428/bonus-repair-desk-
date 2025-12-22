/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Mark nodemailer as external for server-side rendering
  serverExternalPackages: ['nodemailer', 'mysql2'],
}

export default nextConfig
