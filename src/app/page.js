// src/app/page.js (메인 페이지)
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">얼굴 인식 시스템</h1>
      <p className="mt-4">
        <a href="/facerecognition" className="text-blue-500 hover:underline">
          얼굴 인식 시작하기
        </a>
        <a href="/faceextract" className="text-blue-500 hover:underline">
          얼굴 추출시작하기
        </a>
      </p>
    </main>
  );
}
