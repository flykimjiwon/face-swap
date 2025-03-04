'use client';
import { useState } from 'react';

const TestFaceSwapPage = () => {
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [replacementFace, setReplacementFace] = useState(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [testApiResponse, setTestApiResponse] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  const handleGroupPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupPhoto(file);
      addLog(`단체사진 업로드됨: ${file.name}`);
    }
  };

  const handleReplacementFaceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReplacementFace(file);
      addLog(`교체할 얼굴 업로드됨: ${file.name}`);
    }
  };

  const handleTestApiCall = async () => {
    if (!groupPhoto || !replacementFace) {
      alert('단체사진과 교체할 얼굴을 모두 업로드해주세요.');
      return;
    }

    setSwapLoading(true);
    addLog('테스트 API 호출 시작');

    try {
      const formData = new FormData();
      formData.append('source_image', groupPhoto);
      formData.append('face_image', replacementFace);
      formData.append('index', JSON.stringify([0])); // 첫 번째 얼굴만 교체

      const response = await fetch('/api/multi-faceswap', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTestApiResponse(data);
      addLog('테스트 API 호출 완료');
      alert('API 호출 성공!');
    } catch (error) {
      console.error('테스트 API 호출 중 오류 발생:', error);
      addLog(`오류 발생: ${error.message}`);
      alert(`테스트 API 호출 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setSwapLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-blue-50">
      <h1 className="text-3xl font-bold mb-8 text-blue-800">단체사진 얼굴 교체 테스트</h1>

      <div className="mt-8 p-4 bg-green-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-2 text-green-700">테스트 API 섹션</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">단체사진 업로드</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleGroupPhotoUpload}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">교체할 얼굴 업로드</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleReplacementFaceUpload}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
          />
        </div>

        <button
          onClick={handleTestApiCall}
          disabled={swapLoading}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
        >
          {swapLoading ? '변환 중...' : '변환하기'}
        </button>

        {testApiResponse && (
          <div className="mt-4">
            <h4 className="text-lg font-semibold mb-2 text-green-700">API 응답 결과</h4>
            <pre className="bg-white p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(testApiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-2 text-gray-700">로그</h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-600">{logs.join('\n')}</pre>
      </div>
    </div>
  );
};

export default TestFaceSwapPage;
