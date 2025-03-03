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
    }
  }
  
  export default nextConfig;
  