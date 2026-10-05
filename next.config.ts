import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 실험용: StrictMode를 켜면 effect가 두 번 실행되어 콘솔 순서가 흐려진다.
  // 이중 호출까지 보고 싶으면 true로 바꿀 것.
  reactStrictMode: false,
}

export default nextConfig
