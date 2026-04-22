process.env.TZ = 'UTC'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig