/** @type {import('next').NextConfig} */
const nextConfig = {
    // 다른 설정들...
    
    // 개발 모드에서 하이드레이션 오류 무시
    experimental: {
      suppressHydrationWarning: true,
    },
    
    // 환경 변수 설정
    env: {
      API_KEY: process.env.API_KEY,
    },
    webpack: (config) => {
      config.resolve.fallback = { fs: false, encoding: false };
      return config;
    },
  }
  
  export default nextConfig;
  
