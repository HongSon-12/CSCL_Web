const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // 1. Phân hệ Tính toán ETL chỉ số (Python Backend)
      {
        source: '/api/v1/quality/calculate/:path*',
        destination: `${backendUrl}/api/v1/quality/calculate/:path*`,
      },
      {
        source: '/api/v1/quality/input/form-template',
        destination: `${backendUrl}/api/v1/quality/input/form-template`,
      },
      // 2. Phân hệ Agent AI Chat & Tài liệu RAG (Python Backend)
      {
        source: '/api/v1/chat/:path*',
        destination: `${backendUrl}/api/v1/chat/:path*`,
      },
      {
        source: '/api/v1/documents/:path*',
        destination: `${backendUrl}/api/v1/documents/:path*`,
      },
      // 3. Phân hệ Danh mục Master Data & Nghiệp vụ còn lại (Tạm thời proxy đến Python)
      {
        source: '/api/v1/quality/master/:path*',
        destination: `${backendUrl}/api/v1/quality/master/:path*`,
      },
      {
        source: '/api/v1/quality/dashboard/:path*',
        destination: `${backendUrl}/api/v1/quality/dashboard/:path*`,
      },
      {
        source: '/api/v1/quality/indicators/:path*',
        destination: `${backendUrl}/api/v1/quality/indicators/:path*`,
      },
      {
        source: '/api/v1/quality/admin/:path*',
        destination: `${backendUrl}/api/v1/quality/admin/:path*`,
      },
      {
        source: '/api/v1/quality/review/:path*',
        destination: `${backendUrl}/api/v1/quality/review/:path*`,
      },
      {
        source: '/api/v1/quality/import/:path*',
        destination: `${backendUrl}/api/v1/quality/import/:path*`,
      },
      {
        source: '/api/v1/quality/export/:path*',
        destination: `${backendUrl}/api/v1/quality/export/:path*`,
      },
      // 4. API Đăng nhập legacy
      {
        source: '/api/v1/auth/login',
        destination: `${backendUrl}/api/v1/auth/login`,
      },
      {
        source: '/api/v1/auth/me',
        destination: `${backendUrl}/api/v1/auth/me`,
      },
    ]
  },
}

module.exports = nextConfig
