//app/faceextract/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const FaceExtraction = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [extractedFaces, setExtractedFaces] = useState([]);
  const [replacementFaces, setReplacementFaces] = useState([]);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const faceApiInitialized = useRef(false);
  const [transformedImage, setTransformedImage] = useState(null);
  const [allFaceImage, setAllFaceImage] = useState(null); // 새로 추가: 모든 얼굴에 적용할 이미지

  const addLog = (message) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  useEffect(() => {
    console.log(logs.join('\n'));
  }, [logs]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('모델 로딩 시작...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        console.log('모델 로딩 완료!');
        setModelsLoaded(true);
        faceApiInitialized.current = true;
      } catch (error) {
        console.error('모델 로드 중 오류 발생:', error);
        addLog(`face-api.js 모델 로드 실패: ${error.message}`);
        alert('face-api.js 모델 로드에 실패했습니다. 네트워크 연결을 확인해주세요.');
        setModelsLoaded(false);
      }
    };

    if (!faceApiInitialized.current) {
      loadModels();
    }
  }, []);

  const handleExtractFaces = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtractionLoading(true);
    addLog(`파일 선택됨: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target.result);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('img', file);
      addLog('API 요청 시작');
      const response = await fetch('/api/extract-face', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`얼굴 추출 실패: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      addLog('API 응답 받음');
      addLog(`API로 추출된 얼굴 수: ${data.data?.faces?.length || 0}`);
      console.log('API 추출 얼굴 데이터:', data);
      if (data.data && Array.isArray(data.data.faces)) {
        setExtractedFaces(data.data.faces);
        setReplacementFaces(new Array(data.data.faces.length).fill(null));
      } else {
        console.error('예상치 못한 응답 형식:', data);
        addLog('예상치 못한 응답 형식');
        alert('얼굴 추출 데이터를 처리하는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('얼굴 추출 중 오류 발생:', error);
      addLog(`오류 발생: ${error.message}`);
      alert(`얼굴 추출 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setExtractionLoading(false);
      addLog('처리 완료');
    }
  };

  const handleReplacementUpload = (index) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        try {
          if (!modelsLoaded) {
            addLog('face-api.js가 초기화되지 않았습니다.');
            alert('face-api.js가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
          }
          const detections = await faceapi.detectAllFaces(
            canvas,
            new faceapi.TinyFaceDetectorOptions()
          );
          if (detections.length !== 1) {
            addLog('1명의 얼굴만 있는 이미지를 업로드해주세요.');
            alert('1명의 얼굴만 있는 이미지를 업로드해주세요.');
            return;
          }
          const face = detections[0].box;
          const faceCanvas = document.createElement('canvas');
          faceCanvas.width = face.width;
          faceCanvas.height = face.height;
          const faceCtx = faceCanvas.getContext('2d');
          faceCtx.drawImage(
            canvas,
            face.x,
            face.y,
            face.width,
            face.height,
            0,
            0,
            face.width,
            face.height
          );
          const faceDataUrl = faceCanvas.toDataURL('image/jpeg');
          setReplacementFaces((prev) => {
            const newFaces = [...prev];
            newFaces[index] = faceDataUrl;
            return newFaces;
          });
          addLog(`교체 얼굴 ${index + 1} 업로드 및 얼굴 추출 완료`);
        } catch (error) {
          console.error('face-api.js 얼굴 감지 오류:', error);
          addLog(`face-api.js 얼굴 감지 오류: ${error.message}`);
          alert(`얼굴 감지 중 오류가 발생했습니다: ${error.message}`);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAllFaceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        try {
          if (!modelsLoaded) {
            addLog('face-api.js가 초기화되지 않았습니다.');
            alert('face-api.js가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
          }
          const detections = await faceapi.detectAllFaces(
            canvas,
            new faceapi.TinyFaceDetectorOptions()
          );
          if (detections.length !== 1) {
            addLog('1명의 얼굴만 있는 이미지를 업로드해주세요.');
            alert('1명의 얼굴만 있는 이미지를 업로드해주세요.');
            return;
          }
          const face = detections[0].box;
          const faceCanvas = document.createElement('canvas');
          faceCanvas.width = face.width;
          faceCanvas.height = face.height;
          const faceCtx = faceCanvas.getContext('2d');
          faceCtx.drawImage(
            canvas,
            face.x,
            face.y,
            face.width,
            face.height,
            0,
            0,
            face.width,
            face.height
          );
          const faceDataUrl = faceCanvas.toDataURL('image/jpeg');
          setAllFaceImage(faceDataUrl);
          addLog('모든 얼굴 교체용 이미지 업로드 완료');
        } catch (error) {
          console.error('face-api.js 얼굴 감지 오류:', error);
          addLog(`face-api.js 얼굴 감지 오류: ${error.message}`);
          alert(`얼굴 감지 중 오류가 발생했습니다: ${error.message}`);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReplacement = (index) => {
    setReplacementFaces((prev) => {
      const newFaces = [...prev];
      newFaces[index] = null;
      return newFaces;
    });
    addLog(`교체 얼굴 ${index + 1} 제거됨`);
  };

  const handleRemoveAllFace = () => {
    setAllFaceImage(null);
    addLog('모든 얼굴 교체용 이미지 제거됨');
  };

  const handleFaceSwap = async () => {
    if (!uploadedImage) {
      alert('이미지를 업로드해주세요.');
      return;
    }
    
    if (replacementFaces.filter(Boolean).length === 0 && !allFaceImage) {
      alert('교체할 얼굴을 선택해주세요.');
      return;
    }
    
    setSwapLoading(true);
    addLog('얼굴 교체 시작');
    
    try {
      const formData = new FormData();
      const blob = await (await fetch(uploadedImage)).blob();
      formData.append('source_image', blob, 'source_image.jpg');
      
      // 모든 얼굴 교체 모드
      if (allFaceImage) {
        const faceBlob = await (await fetch(allFaceImage)).blob();
        formData.append('face_image', faceBlob, 'all_face.jpg');
        
        // 모든 인덱스 전송
        const allIndices = Array.from({ length: extractedFaces.length }, (_, i) => i);
        formData.append('index', JSON.stringify(allIndices));
      } else {
        // 개별 얼굴 교체 모드
        for (let i = 0; i < replacementFaces.length; i++) {
          const face = replacementFaces[i];
          if (face) {
            const faceBlob = await (await fetch(face)).blob();
            formData.append('face_image', faceBlob, `face_${i}.jpg`);
          }
        }
        
        const validIndices = replacementFaces
          .map((face, index) => (face ? index : null))
          .filter((index) => index !== null);
        formData.append('index', JSON.stringify(validIndices));
      }
      
      const response = await fetch('/api/multi-faceswap', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `얼굴 교체 실패: ${response.status} ${response.statusText} - ${errorData.message}`
        );
      }
      
      const data = await response.json();
      addLog('얼굴 교체 완료');
      setTransformedImage(data.data.image);
    } catch (error) {
      console.error('얼굴 교체 중 오류 발생:', error);
      addLog(`오류 발생: ${error.message}`);
      alert(`얼굴 교체 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setSwapLoading(false);
    }
  };
  

  useEffect(() => {
    if (uploadedImage && extractedFaces.length > 0 && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const extractedFacesContainer =
          document.getElementById('extractedFaces');
        extractedFacesContainer.innerHTML = '';
        extractedFaces.forEach((face, index) => {
          const [x1, y1, x2, y2] = face;
          const centerX = (x1 + x2) / 2;
          const centerY = (y1 + y2) / 2;
          const size = Math.max(x2 - x1, y2 - y1);
          const radius = 50;
          const canvas = document.createElement('canvas');
          canvas.width = radius * 2;
          canvas.height = radius * 2;
          const ctx = canvas.getContext('2d');
          ctx.beginPath();
          ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          const scale = (radius * 2) / size;
          ctx.drawImage(
            img,
            centerX - size / 2,
            centerY - size / 2,
            size,
            size,
            0,
            0,
            radius * 2,
            radius * 2
          );
          const jpgCanvas = document.createElement('canvas');
          jpgCanvas.width = radius * 2;
          jpgCanvas.height = radius * 2;
          const jpgCtx = jpgCanvas.getContext('2d');
          jpgCtx.drawImage(canvas, 0, 0);
          const jpgDataUrl = jpgCanvas.toDataURL('image/jpeg');
          const container = document.createElement('div');
          container.className = 'flex items-center mb-4';
          const extractedFaceImg = document.createElement('img');
          extractedFaceImg.src = canvas.toDataURL();
          extractedFaceImg.alt = `추출된 얼굴 ${index + 1} (WebP)`;
          extractedFaceImg.className = 'w-24 h-24 rounded-full mr-4 object-cover';
          const extractedFaceJpgImg = document.createElement('img');
          extractedFaceJpgImg.src = jpgDataUrl;
          extractedFaceJpgImg.alt = `추출된 얼굴 (JPG) ${index + 1}`;
          extractedFaceJpgImg.className = 'w-24 h-24 rounded-full mr-4 object-cover';
          const replacementContainer = document.createElement('div');
          replacementContainer.className = 'relative w-24 h-24';
          if (replacementFaces[index]) {
            const replacementImg = document.createElement('img');
            replacementImg.src = replacementFaces[index];
            replacementImg.alt = `교체 얼굴 ${index + 1}`;
            replacementImg.className = 'w-24 h-24 rounded-full object-cover';
            const removeButton = document.createElement('button');
            removeButton.innerHTML = '×';
            removeButton.className =
              'absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center';
            removeButton.onclick = () => handleRemoveReplacement(index);
            replacementContainer.appendChild(replacementImg);
            replacementContainer.appendChild(removeButton);
          } else {
            const avatarContainer = document.createElement('div');
            avatarContainer.className =
              'w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer';
            avatarContainer.innerHTML =
              '<span class="text-4xl text-gray-300">+</span>';
            avatarContainer.onclick = () =>
              document.getElementById(`replacement-${index}`).click();
            replacementContainer.appendChild(avatarContainer);
          }
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.id = `replacement-${index}`;
          fileInput.className = 'hidden';
          fileInput.accept = 'image/*';
          fileInput.onchange = handleReplacementUpload(index);
          container.appendChild(extractedFaceImg);
          container.appendChild(extractedFaceJpgImg);
          container.appendChild(replacementContainer);
          container.appendChild(fileInput);
          extractedFacesContainer.appendChild(container);
        });
      };
      img.src = uploadedImage;
    }
  }, [uploadedImage, extractedFaces, replacementFaces, modelsLoaded]);

  return (
    <div className="container mx-auto p-6 bg-blue-50">
      <h1 className="text-3xl font-bold mb-8 text-blue-800">
        얼굴 추출 및 교체 시스템
      </h1>
      {/* 테스트 API 호출 버튼 */}
<div className="mt-4 p-4 bg-purple-50 rounded-lg">
  <h3 className="text-xl font-semibold mb-2 text-purple-700">
    테스트 API
  </h3>
  <p className="text-gray-600 mb-4">
    예제 이미지 URL로 얼굴 교체 API를 테스트합니다.
  </p>
  <button
    onClick={async () => {
      try {
        addLog('테스트 API 호출 시작');
        const response = await fetch('/api/test-faceswap', {
          method: 'POST'
        });
        const data = await response.json();
        addLog('테스트 API 응답: ' + JSON.stringify(data));
        alert('API 호출 성공! task_id: ' + data.data.task_id);
      } catch (error) {
        addLog('테스트 API 오류: ' + error.message);
        alert('API 호출 실패: ' + error.message);
      }
    }}
    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
  >
    테스트 API 호출
  </button>
</div>

      <div className="mb-6">
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full ${
            modelsLoaded
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full mr-2 ${
              modelsLoaded ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          ></span>
          {modelsLoaded ? '모델 로딩 완료' : '모델 로딩 중...'}
        </div>
        {extractionLoading && (
          <div className="inline-flex items-center px-4 py-2 rounded-full ml-2 bg-blue-100 text-blue-800">
            <span className="w-3 h-3 rounded-full mr-2 bg-blue-500 animate-pulse"></span>
            얼굴 추출 중...
          </div>
        )}
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-blue-700">
          이미지 업로드
        </h2>
        <p className="text-gray-600 mb-4">
          얼굴을 추출할 이미지를 업로드하세요.
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={handleExtractFaces}
          disabled={extractionLoading || !modelsLoaded}
          className="block w-full text-sm text-blue-600 mb-4
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {uploadedImage && (
          <div className="mt-6">
            <h3 className="text-2xl font-semibold mb-4 text-blue-700">
              업로드된 이미지
            </h3>
            <img
              src={uploadedImage}
              alt="업로드된 이미지"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}
        {extractedFaces.length > 0 && (
          <>
            <div className="mt-6">
              <h3 className="text-2xl font-semibold mb-4 text-blue-700">
                추출된 얼굴
              </h3>
              <p className="text-gray-600 mb-2">왼쪽: WebP, 오른쪽: JPG</p>
              <div id="extractedFaces" className="space-y-4"></div>
            </div>
            
            {/* 새로 추가: 모든 얼굴 교체 섹션 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-700">
                모든 얼굴 교체
              </h3>
              <p className="text-gray-600 mb-4">
                하나의 얼굴로 모든 감지된 얼굴을 교체합니다.
              </p>
              
              <div className="flex items-center mb-4">
                <div className="relative w-24 h-24 mr-4">
                  {allFaceImage ? (
                    <>
                      <img
                        src={allFaceImage}
                        alt="모든 얼굴 교체용 이미지"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                      <button
                        onClick={handleRemoveAllFace}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div
                      onClick={() => document.getElementById('all-face-input').click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center cursor-pointer"
                    >
                      <span className="text-4xl text-blue-300">+</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-blue-800">
                    {allFaceImage ? '교체용 얼굴 업로드 완료' : '교체용 얼굴 이미지 업로드'}
                  </p>
                  <p className="text-sm text-gray-600">
                    이 얼굴로 모든 감지된 얼굴을 교체합니다
                  </p>
                </div>
                <input
                  type="file"
                  id="all-face-input"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAllFaceUpload}
                />
              </div>
            </div>
            
            <button
              onClick={handleFaceSwap}
              disabled={
                swapLoading ||
                (replacementFaces.filter(Boolean).length === 0 && !allFaceImage) ||
                !modelsLoaded
              }
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {swapLoading ? '얼굴 교체 중...' : '얼굴 교체하기'}
            </button>
            
            {transformedImage && (
              <div className="mt-6">
                <h3 className="text-2xl font-semibold mb-4 text-green-700">
                  변환된 이미지
                </h3>
                <img
                  src={transformedImage}
                  alt="변환된 이미지"
                  className="max-w-full h-auto rounded-lg border-2 border-green-500"
                />
              </div>
            )}
          </>
        )}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-2 text-gray-700">로그</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-600">
            {logs.join('\n')}
          </pre>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default FaceExtraction;
