'use client'
import { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [registeredFaces, setRegisteredFaces] = useState([]);
  const [compareImages, setCompareImages] = useState([]);
  const maxRegisteredFaces = 10; // 최대 등록 가능한 인물 수
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(0);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [compareImageSizes, setCompareImageSizes] = useState({});
  
  const groupPhotoRef = useRef(null);
  
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
  const generateId = (prefix) => {
    // 고유한 ID 생성
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}`;
  };
  
  // 이미지 로드 완료 시 실제 크기 저장
  const handleImageLoad = (e) => {
    setImageSize({
      width: e.target.clientWidth,
      height: e.target.clientHeight
    });
  };
  
  // 비교 이미지 로드 완료 시 크기 저장
  const handleCompareImageLoad = (id, e) => {
    setCompareImageSizes(prev => ({
      ...prev,
      [id]: {
        width: e.target.clientWidth,
        height: e.target.clientHeight
      }
    }));
  };

  // 좌표 변환 함수
  const adjustedBox = (box, originalWidth, originalHeight, displayWidth, displayHeight) => {
    // 이미지 원본 크기와 화면에 표시된 크기의 비율 계산
    const scaleX = displayWidth / originalWidth;
    const scaleY = displayHeight / originalHeight;
    
    return {
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY
    };
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
      setImageSize({ width: 0, height: 0 }); // 이미지 크기 초기화
      
      // 모든 얼굴 감지
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        // 모든 감지된 얼굴 정보 저장 - 고유 ID 부여
        const faces = detections.map((detection, index) => ({
          id: generateId(`group_face_${index}`),
          detection: detection,
          box: detection.detection.box,
          descriptor: detection.descriptor,
          registered: false,
          originalSize: {
            width: img.width,
            height: img.height
          }
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

    // 인물 등록
    setRegisteredFaces(prev => [...prev, {
      id: generateId('face'),
      name,
      descriptor: face.descriptor,
      image: groupPhoto,
      box: face.box,
      originalSize: face.originalSize
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
              box: detection.detection.box,
              originalSize: {
                width: img.width,
                height: img.height
              }
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
              box: detection.detection.box,
              originalSize: {
                width: img.width,
                height: img.height
              }
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
      const compareId = generateId('compare');
      
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
          id: compareId,
          image: img.src,
          faceCount: detections.length,
          faceResults,
          originalSize: {
            width: img.width,
            height: img.height
          }
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
    // 이미지 크기 정보도 제거
    setCompareImageSizes(prev => {
      const newSizes = { ...prev };
      delete newSizes[imageId];
      return newSizes;
    });
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
              <img 
                src={groupPhoto} 
                alt="단체사진" 
                className="max-w-full h-auto rounded-lg" 
                onLoad={handleImageLoad}
                ref={groupPhotoRef}
              />
              
              {/* 감지된 얼굴에 박스 표시 - 좌표 조정 */}
              {detectedFaces.map((face, index) => {
                // 이미지 크기 정보가 있는 경우에만 얼굴 박스 표시
                if (!imageSize.width) return null;
                
                // 조정된 박스 좌표 계산
                const adjustedCoords = adjustedBox(
                  face.box,
                  face.originalSize.width,
                  face.originalSize.height,
                  imageSize.width,
                  imageSize.height
                );
                
                return (
                  <div
                    key={face.id}
                    className={`absolute border-2 ${face.registered ? 'border-green-500' : 'border-blue-500'} cursor-pointer`}
                    style={{
                      left: adjustedCoords.x + 'px',
                      top: adjustedCoords.y + 'px',
                      width: adjustedCoords.width + 'px',
                      height: adjustedCoords.height + 'px'
                    }}
                    onClick={() => registerPersonFromGroup(index)}
                    title={face.registered ? '이미 등록됨' : '클릭하여 등록'}
                  >
                    <div className="absolute -top-7 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      {face.registered ? '등록됨' : `얼굴 #${index + 1}`}
                    </div>
                  </div>
                );
              })}
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
            {registeredFaces.map((face) => {
              // 각 인물 카드의 이미지 컨테이너 참조를 생성
              const imgContainerRef = useRef(null);
              const [personImgSize, setPersonImgSize] = useState({ width: 0, height: 0 });
              
              const handlePersonImageLoad = (e) => {
                if (imgContainerRef.current) {
                  setPersonImgSize({
                    width: imgContainerRef.current.clientWidth,
                    height: imgContainerRef.current.clientHeight
                  });
                }
              };
              
              return (
                <div key={face.id} className="border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow relative">
                  <button
                    onClick={() => handleRemoveFace(face.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    title="인물 삭제"
                  >
                    ×
                  </button>
                  <div 
                    className="aspect-square relative overflow-hidden rounded-lg mb-3 group"
                    ref={imgContainerRef}
                  >
                    <img
                      src={face.image}
                      alt={face.name}
                      className="w-full h-full object-contain"
                      onLoad={handlePersonImageLoad}
                    />
                    
                    {/* 얼굴 위치에 하이라이트 표시 - 조정된 좌표 사용 */}
                    {face.box && personImgSize.width > 0 && (
                      <div
                        className="absolute border-2 border-green-500 pointer-events-none"
                        style={{
                          ...adjustedBox(
                            face.box,
                            face.originalSize.width,
                            face.originalSize.height,
                            personImgSize.width,
                            personImgSize.height
                          ),
                          position: 'absolute'
                        }}
                      ></div>
                    )}
                    
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
              );
            })}
          </div>
        )}
      </div>

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
        
        {registeredFaces.length === 0 && (
          <p className="text-yellow-600 bg-yellow-50 p-4 rounded-lg mb-6">
            인물을 먼저 등록해야 비교가 가능합니다.
          </p>
        )}

        {compareImages.length === 0 ? (
          <p className="text-gray-500">비교할 이미지가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {compareImages.map((item) => (
              <div key={item.id} className="border border-blue-200 rounded-xl p-4">
                <div className="relative">
                  <button
                    onClick={() => handleRemoveCompareImage(item.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    title="이미지 삭제"
                  >
                    ×
                  </button>
                  <h3 className="font-medium mb-3 text-blue-800">
                    감지된 얼굴: {item.faceCount}명
                  </h3>
                  <div className="relative mb-4">
                    <img
                      src={item.image}
                      alt="비교 이미지"
                      className="w-full h-auto rounded-lg"
                      onLoad={(e) => handleCompareImageLoad(item.id, e)}
                    />
                    
                    {/* 감지된 얼굴에 박스 표시 - 조정된 좌표 사용 */}
                    {compareImageSizes[item.id] && item.faceResults.map((face, faceIndex) => {
                      // 조정된 박스 좌표 계산
                      const adjustedCoords = adjustedBox(
                        face.box,
                        item.originalSize.width,
                        item.originalSize.height,
                        compareImageSizes[item.id].width,
                        compareImageSizes[item.id].height
                      );
                      
                      return (
                        <div
                          key={faceIndex}
                          className="absolute border-2 border-blue-500"
                          style={{
                            left: adjustedCoords.x + 'px',
                            top: adjustedCoords.y + 'px',
                            width: adjustedCoords.width + 'px',
                            height: adjustedCoords.height + 'px'
                          }}
                        >
                          <div className="absolute -top-7 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            얼굴 #{faceIndex + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 각 얼굴별 유사도 분석 */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    {item.faceResults.map((face, faceIndex) => (
                      <div key={faceIndex} className="mb-4">
                        <h4 className="font-medium mb-2 text-blue-700">얼굴 #{faceIndex + 1} 유사도 분석:</h4>
                        {face.similarities.length > 0 ? (
                          <div>
                            {face.similarities
                              .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity))
                              .slice(0, 3) // 상위 3개만 표시
                              .map((sim, simIndex) => (
                                <div key={simIndex} className="mb-2">
                                  <p className="text-sm text-blue-700 font-medium">
                                    {sim.name}: {sim.similarity}%
                                  </p>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className="bg-blue-600 h-2.5 rounded-full" 
                                      style={{ width: `${Math.min(parseFloat(sim.similarity), 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">등록된 인물이 없어 유사도를 분석할 수 없습니다.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition;
