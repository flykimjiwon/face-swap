// app/facerecognition/page.js
'use client'

import dynamic from 'next/dynamic'

// 클라이언트 컴포넌트를 동적으로 불러오기 (SSR 없이)
const FaceRecognition = dynamic(
  () => import('../../components/FaceRecognition'),
  { ssr: false } // 서버 사이드 렌더링 비활성화
)

export default function FaceRecognitionPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">얼굴 인식 시스템</h1>
      <FaceRecognition />
    </div>
  )
}
