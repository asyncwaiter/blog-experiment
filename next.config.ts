import type { NextConfig } from 'next'

// 실험: 클라이언트 그래프에서 서버 전용 모듈 import (src/lib/cases/*).
// EXP_CASE로 케이스 파일을 고르고, 컴포넌트는 항상 '@exp/subject'만 import한다.
// Turbopack resolveAlias는 './src/...'를 못 푼다. 앞의 '/'는 프로젝트 루트 기준으로 해석된다.
const CASE = process.env.EXP_CASE ?? 'headers-dynamic'
process.env.NEXT_PUBLIC_EXP_CASE = CASE

const nextConfig: NextConfig = {
  // 실험용: StrictMode를 켜면 effect가 두 번 실행되어 콘솔 순서가 흐려진다.
  // 이중 호출까지 보고 싶으면 true로 바꿀 것.
  reactStrictMode: false,
  // 실험용: 빌드 청크의 소스맵으로 어떤 그래프에 어떤 파일이 들어갔는지 확인한다.
  productionBrowserSourceMaps: true,
  experimental: { serverSourceMaps: true },
  turbopack: {
    resolveAlias: {
      '@exp/subject': `/src/lib/cases/${CASE}.ts`,
    },
  },
}

export default nextConfig
