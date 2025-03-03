//FaceRecognition.js
'use client'
import { useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [registeredFaces, setRegisteredFaces] = useState([]);
  const [compareImages, setCompareImages] = useState([]);
  const maxRegisteredFaces = 10; // 최대 등록 가능한 인물 수 증가
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(0);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [detectedFaces, setDetectedFaces] = useState([]);

  


  // 얼굴 변환 시스템 관련 상태
const [faceSwapPhoto, setFaceSwapPhoto] = useState(null);
const [swapDetectedFaces, setSwapDetectedFaces] = useState([]);
// swapResultImage 상태를 객체로 변경
const [swapResultImage, setSwapResultImage] = useState(null);
const [registeredFaceIds, setRegisteredFaceIds] = useState([]);

  
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('모델 로딩 시작...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        console.log('모델 로딩 완료!');
        setModelsLoaded(true);
      } catch (error) {
        console.error('모델 로드 중 오류 발생:', error);
      }
    };

    loadModels();
  }, []);

  // ID 생성 함수
// ID 생성 함수 수정
const generateId = (prefix) => {
    // 현재 시간과 랜덤 값을 조합하여 고유한 ID 생성
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    const id = `${prefix}_${timestamp}_${random}`;
    return id;
  };
  

  // 단체사진 처리 함수
  const handleGroupPhoto = async (e) => {
    if (!modelsLoaded || loading) return;
    
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // 이미지를 HTML 이미지 요소로 변환
      const img = await createImageElement(file);
      setGroupPhoto(img.src);
      
      // 모든 얼굴 감지
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        // 단체사진 처리 함수 - 수정 부분
        const faces = detections.map((detection, index) => ({
            id: generateId(`group_face_${index}`), // 인덱스를 추가하여 더 고유한 ID 생성
            detection: detection,
            box: detection.detection.box,
            descriptor: detection.descriptor,
            registered: false
        }));
        
        setDetectedFaces(faces);
        alert(`단체사진에서 ${detections.length}명의 얼굴이 감지되었습니다.`);
      } else {
        alert('이미지에서 얼굴을 찾을 수 없습니다.');
        setDetectedFaces([]);
      }
    } catch (error) {
      console.error('단체사진 처리 중 오류 발생:', error);
      alert('단체사진 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 단체사진에서 인물 등록
  const registerPersonFromGroup = (faceIndex) => {
    const face = detectedFaces[faceIndex];
    if (face.registered) {
      alert('이미 등록된 인물입니다.');
      return;
    }

    if (registeredFaces.length >= maxRegisteredFaces) {
      alert(`최대 ${maxRegisteredFaces}명까지만 등록할 수 있습니다.`);
      return;
    }

    const name = prompt('등록할 인물의 이름을 입력하세요:');
    if (!name) return;

    // 얼굴 이미지 추출 (이 부분은 간소화됨, 실제로는 캔버스를 사용해 얼굴 부분만 추출할 수 있음)
    setRegisteredFaces(prev => [...prev, {
      id: generateId('face'),
      name,
      descriptor: face.descriptor,
      image: groupPhoto, // 전체 이미지 사용 (실제로는 얼굴 부분만 추출 가능)
      box: face.box // 얼굴 위치 정보
    }]);

    // 등록된 얼굴 표시
    setDetectedFaces(prev => 
      prev.map((item, idx) => 
        idx === faceIndex ? { ...item, registered: true } : item
      )
    );
  };

  // 일반 인물 등록 함수
  const handleRegisterFace = async (e) => {
    if (!modelsLoaded || registeredFaces.length >= maxRegisteredFaces || loading) return;
    
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const img = await createImageElement(file);
      
      // 얼굴 감지
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        if (detections.length === 1) {
          // 단일 얼굴 처리
          const detection = detections[0];
          const name = prompt('등록할 인물의 이름을 입력하세요:');
          if (name) {
            setRegisteredFaces(prev => [...prev, {
              id: generateId('face'),
              name,
              descriptor: detection.descriptor,
              image: img.src,
              box: detection.detection.box
            }]);
          }
        } else {
          // 여러 얼굴이 감지된 경우 단체사진 처리로 리디렉션
          alert(`${detections.length}명의 얼굴이 감지되었습니다. 단체사진 등록 기능을 이용해주세요.`);
        }
      } else {
        alert('이미지에서 얼굴을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('얼굴 등록 중 오류 발생:', error);
      alert('얼굴 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 등록된 얼굴 제거 함수
  const handleRemoveFace = (faceId) => {
    setRegisteredFaces(prev => prev.filter(face => face.id !== faceId));
    updateComparisonResults();
  };

  // 인물 이미지 변경 함수
  const handleChangeImage = async (faceId) => {
    if (!modelsLoaded || loading) return;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      try {
        const img = await createImageElement(file);
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setRegisteredFaces(prev => prev.map(face => 
            face.id === faceId ? { 
              ...face, 
              image: img.src,
              descriptor: detection.descriptor,
              box: detection.detection.box
            } : face
          ));
          updateComparisonResults();
        } else {
          alert('이미지에서 얼굴을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('이미지 변경 중 오류 발생:', error);
        alert('이미지 변경 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fileInput.click();
  };

  // 이름 수정 함수
  const handleEditName = (faceId, currentName) => {
    const newName = prompt('새로운 이름을 입력하세요:', currentName);
    if (newName && newName !== currentName) {
      setRegisteredFaces(prev => prev.map(face => 
        face.id === faceId ? { ...face, name: newName } : face
      ));
      updateComparisonResults();
    }
  };

  // 비교 결과 업데이트 함수
  const updateComparisonResults = () => {
    setCompareImages(prev => prev.map(item => {
      const updatedFaceResults = item.faceResults.map(faceResult => ({
        ...faceResult,
        similarities: registeredFaces.map(face => ({
          name: face.name,
          similarity: ((1 - faceapi.euclideanDistance(faceResult.descriptor, face.descriptor)) * 100).toFixed(2)
        }))
      }));
      
      return {
        ...item,
        faceResults: updatedFaceResults
      };
    }));
  };

  // 비교할 이미지 추가 함수
  const handleCompareAdd = async (e) => {
    if (!modelsLoaded || loading) return;
    
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const img = await createImageElement(file);
      
      // 모든 얼굴 감지
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        // 각 얼굴에 대한 유사도 계산
        const faceResults = detections.map(detection => {
          const similarities = registeredFaces.map(face => ({
            name: face.name,
            similarity: ((1 - faceapi.euclideanDistance(detection.descriptor, face.descriptor)) * 100).toFixed(2)
          }));

          return {
            box: detection.detection.box,
            descriptor: detection.descriptor,
            similarities
          };
        });

        setCompareImages(prev => [...prev, {
          id: generateId('compare'),
          image: img.src,
          faceCount: detections.length,
          faceResults
        }]);

        alert(`비교 이미지에서 ${detections.length}명의 얼굴이 감지되었습니다.`);
      } else {
        alert('비교할 이미지에서 얼굴을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('얼굴 비교 중 오류 발생:', error);
      alert('얼굴 비교 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 비교 이미지 제거 함수
  const handleRemoveCompareImage = (imageId) => {
    setCompareImages(prev => prev.filter(item => item.id !== imageId));
  };

  // 파일에서 이미지 요소 생성 헬퍼 함수
  const createImageElement = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 변환할 단체사진 업로드 함수
const handleFaceSwapPhoto = async (e) => {
    if (!modelsLoaded || loading) return;
    
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    
    try {
      // 이미지를 HTML 이미지 요소로 변환
      const img = await createImageElement(file);
      setFaceSwapPhoto(img.src);
      
      // 모든 얼굴 감지
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
        
      if (detections.length >= 2) { // 2명 이상 인식
        // 감지된 얼굴과 등록된 얼굴 비교
        const faceIds = [];
        const faces = detections.map((detection, index) => {
          // 소수점 제거하여 정수로 변환
          const box = {
            x: Math.round(detection.detection.box.x),
            y: Math.round(detection.detection.box.y),
            width: Math.round(detection.detection.box.width),
            height: Math.round(detection.detection.box.height)
          };
          
          // 등록된 얼굴인지 확인
          const isRegistered = registeredFaces.some(registered => {
            const distance = faceapi.euclideanDistance(
              detection.descriptor,
              registered.descriptor
            );
            return distance < 0.4; // 유사도 임계값 (낮을수록 더 유사)
          });
          
          const id = generateId(`swap_face_${index}`);
          if (isRegistered) {
            faceIds.push(id);
          }
          
          return {
            id: id,
            box: box,
            descriptor: detection.descriptor
          };
        });
        
        setSwapDetectedFaces(faces);
        setRegisteredFaceIds(faceIds);
        
        if (faces.length - faceIds.length === 0) {
          alert('모든 얼굴이 등록된 얼굴로 감지되었습니다. 변환할 대상이 없습니다.');
        } else {
          alert(`${faces.length}명의 얼굴이 감지되었으며, 그 중 ${faceIds.length}명은 등록된 얼굴로 변환에서 제외됩니다.`);
        }
      } else if (detections.length === 1) {
        alert('최소 2명 이상의 얼굴이 있는 사진을 업로드해주세요.');
        setSwapDetectedFaces([]);
        setRegisteredFaceIds([]);
      } else {
        alert('이미지에서 얼굴을 찾을 수 없습니다.');
        setSwapDetectedFaces([]);
        setRegisteredFaceIds([]);
      }
    } catch (error) {
      console.error('얼굴 변환 사진 처리 중 오류 발생:', error);
      alert('얼굴 변환 사진 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
// 얼굴 변환 시작 함수
const handleFaceSwapStart = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      // 원본 이미지 가져오기
      const originalImage = new Image();
      originalImage.src = faceSwapPhoto;
      
      await new Promise((resolve) => {
        originalImage.onload = resolve;
      });
      
      // 캔버스 생성 (블랙박스 이미지용)
      const blackBoxCanvas = document.createElement('canvas');
      blackBoxCanvas.width = originalImage.width;
      blackBoxCanvas.height = originalImage.height;
      const blackBoxCtx = blackBoxCanvas.getContext('2d');
      
      // 원본 이미지 그리기
      blackBoxCtx.drawImage(originalImage, 0, 0);
      
      // 등록된 얼굴(변환 제외)에 검은색 박스 그리기 - 변환 대상 표시 제거
      swapDetectedFaces.forEach(face => {
        if (registeredFaceIds.includes(face.id)) {
          // 검은색 블랙박스로 얼굴 가리기
          blackBoxCtx.fillStyle = 'rgba(0, 0, 0, 1)'; // 완전 불투명 검은색
          blackBoxCtx.fillRect(face.box.x, face.box.y, face.box.width, face.box.height);
        }
        // 변환 대상 얼굴 표시 제거 (요청에 따라)
      });
      
      // 캔버스를 이미지로 변환 (블랙박스 이미지)
      const blackBoxedImageUrl = blackBoxCanvas.toDataURL('image/jpeg');
      
      // 변환 제외 얼굴 부분만 추출
      const facesArray = [];
      
      // 각 등록된 얼굴 부분 추출
      for (const face of swapDetectedFaces) {
        if (registeredFaceIds.includes(face.id)) {
          // 얼굴 부분만 추출할 캔버스 생성
          const faceCanvas = document.createElement('canvas');
          // 패딩 추가하여 얼굴 주변 컨텍스트 포함
          const padding = 20;
          faceCanvas.width = face.box.width + (padding * 2);
          faceCanvas.height = face.box.height + (padding * 2);
          const faceCtx = faceCanvas.getContext('2d');
          
          // 원본 이미지에서 해당 얼굴 부분 잘라내기 (패딩 포함)
          faceCtx.drawImage(
            originalImage,
            Math.max(0, face.box.x - padding),
            Math.max(0, face.box.y - padding),
            face.box.width + (padding * 2),
            face.box.height + (padding * 2),
            0, 0,
            faceCanvas.width,
            faceCanvas.height
          );
          
          // 얼굴 영역 표시
          faceCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // 초록색 테두리
          faceCtx.lineWidth = 2;
          faceCtx.strokeRect(padding, padding, face.box.width, face.box.height);
          
          // 캔버스를 이미지로 변환
          const faceImageUrl = faceCanvas.toDataURL('image/jpeg');
          
          // 추출한 얼굴 이미지와 좌표 정보 저장
          facesArray.push({
            id: face.id,
            image: faceImageUrl,
            box: face.box
          });
        }
      }
      
      // 결과 이미지 설정
      setSwapResultImage({
        blackBoxed: blackBoxedImageUrl,
        extractedFaces: facesArray
      });
      
      // 여기서 실제 API 호출을 구현할 수 있습니다.
      // API 호출 코드...
      
      alert('얼굴 변환 마스킹이 완료되었습니다. (API 구현 필요)');
    } catch (error) {
      console.error('얼굴 변환 중 오류 발생:', error);
      alert('얼굴 변환 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  
  
  
  // 이미지 저장 함수
  const saveImage = (imageSrc, fileName) => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 모든 얼굴 저장 함수
const saveAllFaces = (faces) => {
    faces.forEach((face, index) => {
      saveImage(face.image, `얼굴_${index + 1}.jpg`);
    });
  };
  
  

  return (
    <div className="container mx-auto p-6 bg-blue-50">
      <h1 className="text-3xl font-bold mb-8 text-blue-800">얼굴 인식 시스템</h1>
      
      {/* 모델 로딩 상태 표시 */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-4 py-2 rounded-full ${modelsLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          <span className={`w-3 h-3 rounded-full mr-2 ${modelsLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          {modelsLoaded ? '모델 로딩 완료' : '모델 로딩 중...'}
        </div>
        
        {loading && (
          <div className="inline-flex items-center px-4 py-2 rounded-full ml-2 bg-blue-100 text-blue-800">
            <span className="w-3 h-3 rounded-full mr-2 bg-blue-500 animate-pulse"></span>
            처리 중...
          </div>
        )}
      </div>
      
      {/* 개별 얼굴 등록 섹션 */}
      <div className="mb-10 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-blue-700">개별 인물 등록</h2>
        <p className="text-gray-600 mb-4">한 명의 얼굴이 있는 사진을 업로드하여 인물을 등록하세요.</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleRegisterFace}
          disabled={!modelsLoaded || registeredFaces.length >= maxRegisteredFaces || loading}
          className="block w-full text-sm text-blue-600 mb-4
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-sm text-blue-600">
          등록된 인물 수: {registeredFaces.length}/{maxRegisteredFaces}
        </p>
      </div>

      {/* 단체사진 처리 섹션 */}
      <div className="mb-10 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-blue-700">단체사진 처리</h2>
        <p className="text-gray-600 mb-4">여러 명의 얼굴이 있는 사진을 업로드하여 인물을 선택적으로 등록하세요.</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleGroupPhoto}
          disabled={!modelsLoaded || loading}
          className="block w-full text-sm text-blue-600 mb-4
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {groupPhoto && (
          <div className="mt-4">
            <div className="relative inline-block">
              <img src={groupPhoto} alt="단체사진" className="max-w-full h-auto rounded-lg" />
              
              {/* 감지된 얼굴에 박스 표시 */}
              {detectedFaces.map((face, index) => (
                <div
                  key={face.id}
                  className={`absolute border-2 ${face.registered ? 'border-green-500' : 'border-blue-500'} cursor-pointer`}
                  style={{
                    left: face.box.x + 'px',
                    top: face.box.y + 'px',
                    width: face.box.width + 'px',
                    height: face.box.height + 'px'
                  }}
                  onClick={() => registerPersonFromGroup(index)}
                  title={face.registered ? '이미 등록됨' : '클릭하여 등록'}
                >
                  <div className="absolute -top-7 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {face.registered ? '등록됨' : `얼굴 #${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="mt-4 text-blue-700">
              감지된 얼굴: {detectedFaces.length}명 
              (등록된 얼굴: {detectedFaces.filter(f => f.registered).length}명)
            </p>
            <p className="text-sm text-gray-600">
              등록하려는 얼굴을 클릭하세요.
            </p>
          </div>
        )}
      </div>

      {/* 등록된 인물 목록 */}
      <div className="mb-10 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-6 text-blue-700">등록된 인물 목록</h2>
        {registeredFaces.length === 0 ? (
          <p className="text-gray-500">등록된 인물이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {registeredFaces.map((face) => (
              <div key={face.id} className="border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow relative">
                <button
                  onClick={() => handleRemoveFace(face.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  title="인물 삭제"
                >
                  ×
                </button>
                <div className="aspect-square relative overflow-hidden rounded-lg mb-3 group">
                  <div className="absolute inset-0">
                    <div 
                      className="relative w-full h-full"
                      style={{
                        backgroundImage: `url(${face.image})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* 얼굴 위치에 하이라이트 표시 */}
                      {face.box && (
                        <div
                          className="absolute border-2 border-green-500"
                          style={{
                            left: face.box.x + 'px',
                            top: face.box.y + 'px',
                            width: face.box.width + 'px',
                            height: face.box.height + 'px',
                            transform: 'scale(1)'
                          }}
                        ></div>
                      )}
                    </div>
                  </div>
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                    onClick={() => handleChangeImage(face.id)}
                  >
                    <span className="text-white font-semibold text-sm bg-blue-600 px-2 py-1 rounded">이미지 변경</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-blue-700">{face.name}</p>
                  <button
                    onClick={() => handleEditName(face.id, face.name)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    title="이름 수정"
                  >
                    수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 얼굴 비교 섹션 */}
   {/* 얼굴 비교 섹션 */}
<div className="bg-white p-6 rounded-xl shadow-lg">
  <h2 className="text-2xl font-semibold mb-6 text-blue-700">얼굴 비교</h2>
  <p className="text-gray-600 mb-4">사진을 업로드하여 등록된 인물들과 비교하세요. 단체사진도 업로드 가능합니다.</p>
  <input
    type="file"
    accept="image/*"
    onChange={handleCompareAdd}
    disabled={!modelsLoaded || registeredFaces.length === 0 || loading}
    className="block w-full text-sm text-blue-600 mb-6
      file:mr-4 file:py-2 file:px-4
      file:rounded-full file:border-0
      file:text-sm file:font-semibold
      file:bg-blue-50 file:text-blue-700
      hover:file:bg-blue-100
      disabled:opacity-50 disabled:cursor-not-allowed"
  />
  
  {compareImages.length === 0 ? (
    <p className="text-gray-500">비교할 이미지가 없습니다.</p>
  ) : (
    compareImages.map((item) => (
      <div key={item.id} className="mb-8">
        <h3 className="font-medium mb-3 text-blue-800">
          감지된 얼굴: {item.faceCount}명
        </h3>
        
        <div className="relative inline-block">
          <img src={item.image} alt="비교 이미지" className="max-w-full h-auto rounded-lg" />
          
          {/* 감지된 얼굴에 박스 표시 */}
          {item.faceResults.map((face, faceIndex) => (
            <div
              key={faceIndex}
              className="absolute border border-blue-500"
              style={{
                left: `${face.box.x}px`,
                top: `${face.box.y}px`,
                width: `${face.box.width}px`,
                height: `${face.box.height}px`
              }}
            >
              <div className="absolute -top-7 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                얼굴 #{faceIndex + 1}
                <br />
                좌표: ({face.box.x}, {face.box.y})
              </div>
            </div>
          ))}
        </div>

        {/* 유사도 분석 결과 */}
        <div className="bg-blue-50 p-4 rounded-lg mt-4">
          {item.faceResults.map((face, faceIndex) => (
            <div key={faceIndex} className="mb-4">
              <h4 className="font-medium mb-2 text-blue-700">얼굴 #{faceIndex + 1} 유사도 분석:</h4>
              {face.similarities.length > 0 ? (
                face.similarities.map((sim, simIndex) => (
                  <p key={simIndex} className="text-sm text-gray-600">
                    {sim.name}: {sim.similarity}%
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-500">등록된 인물이 없어 유사도를 분석할 수 없습니다.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    ))
  )}
</div>


{/* 얼굴 변환 시스템 섹션 */}
<div className="mt-10 bg-white p-6 rounded-xl shadow-lg">
  <h2 className="text-3xl font-bold mb-6 text-blue-800">얼굴 변환 시스템</h2>
  <p className="text-gray-600 mb-6">등록된 얼굴을 제외하고 다른 얼굴로 변환할 수 있습니다.</p>
  
  {/* 변환할 단체사진 업로드 섹션 */}
  <div className="mb-10 bg-blue-50 p-6 rounded-xl">
    <h3 className="text-2xl font-semibold mb-4 text-blue-700">변환할 단체사진 업로드</h3>
    <p className="text-gray-600 mb-4">2명 이상의 얼굴이 있는 사진을 업로드하세요. 등록된 얼굴을 제외한 나머지 얼굴이 변환됩니다.</p>
    <input
      type="file"
      accept="image/*"
      onChange={handleFaceSwapPhoto}
      disabled={!modelsLoaded || loading}
      className="block w-full text-sm text-blue-600 mb-4
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100
        disabled:opacity-50 disabled:cursor-not-allowed"
    />
    
    {faceSwapPhoto && (
      <div className="mt-4">
        <div className="relative">
          <img src={faceSwapPhoto} alt="변환할 단체사진" className="max-w-full h-auto rounded-lg" />
          
          {/* 감지된 얼굴에 박스 표시 */}
          {swapDetectedFaces.map((face, index) => {
            // 등록된 얼굴인지 확인
            const isRegistered = registeredFaceIds.includes(face.id);
            
            return (
              <div
                key={face.id}
                className="absolute"
                style={{
                  left: face.box.x + 'px',
                  top: face.box.y + 'px',
                  width: face.box.width + 'px',
                  height: face.box.height + 'px'
                }}
              >
                <div className={`absolute border-2 ${isRegistered ? 'border-green-500' : 'border-red-500'} w-full h-full`}></div>
                <div className={`absolute -top-7 left-0 ${isRegistered ? 'bg-green-600' : 'bg-red-600'} text-white text-xs px-2 py-1 rounded`}>
                  {isRegistered ? '변환 제외' : '변환 대상'}
                  <br/>
                  좌표: ({face.box.x}, {face.box.y})
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-blue-700">
            총 얼굴: {swapDetectedFaces.length}명
            (변환 제외: {swapDetectedFaces.filter(f => registeredFaceIds.includes(f.id)).length}명, 
            변환 대상: {swapDetectedFaces.filter(f => !registeredFaceIds.includes(f.id)).length}명)
          </p>
          <button
            onClick={handleFaceSwapStart}
            disabled={loading || swapDetectedFaces.filter(f => !registeredFaceIds.includes(f.id)).length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            얼굴 변환 시작
          </button>
        </div>
      </div>
    )}
  </div>
  
{/* 변환 결과 화면 */}
<div className="bg-blue-50 p-6 rounded-xl">
  <h3 className="text-2xl font-semibold mb-4 text-blue-700">변환 결과</h3>
  
  {swapResultImage ? (
    <div className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 좌측: 블랙박스 이미지 */}
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <h4 className="font-medium mb-2 text-blue-700">블랙박스 처리된 이미지</h4>
          <div className="relative">
            <img src={swapResultImage.blackBoxed} alt="블랙박스 처리된 이미지" className="w-full h-auto rounded-lg" />
          </div>
          <div className="mt-2 text-center">
            <button
              onClick={() => saveImage(swapResultImage.blackBoxed, '블랙박스_이미지.jpg')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2"
            >
              블랙박스 이미지 저장
            </button>
          </div>
        </div>
        
        {/* 우측: 추출된 얼굴 이미지들 */}
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <h4 className="font-medium mb-2 text-blue-700">변환 제외 얼굴 ({swapResultImage.extractedFaces.length}명)</h4>
          
          {swapResultImage.extractedFaces.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {swapResultImage.extractedFaces.map((face, index) => (
                  <div key={face.id} className="border border-gray-200 rounded-lg p-2">
                    <div className="relative">
                      <img src={face.image} alt={`얼굴 ${index + 1}`} className="w-full h-auto rounded-lg" />
                    </div>
                    <p className="text-xs text-center mt-1">
                      좌표: ({face.box.x}, {face.box.y})
                    </p>
                    <div className="text-center mt-1">
                      <button
                        onClick={() => saveImage(face.image, `얼굴_${index + 1}.jpg`)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                      >
                        이 얼굴 저장
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => saveAllFaces(swapResultImage.extractedFaces)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  모든 얼굴 저장
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center">변환 제외 얼굴이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  ) : (
    <p className="text-gray-500">아직 변환된 결과가 없습니다. 위에서 사진을 업로드하고 변환을 시작하세요.</p>
  )}
</div>



</div>

    </div>
  );
};

export default FaceRecognition;
