import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 80],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/s/files/**',
      },
    ],
  },
  async rewrites() {
    if (!supabaseUrl) return []

    return [
      {
        source: '/cdn/:path*',
        destination: `${supabaseUrl}/storage/v1/object/public/:path*`,
      },
    ]
  },
}

export default nextConfig
