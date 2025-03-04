import axios from 'axios';
import { NextResponse } from 'next/server';
import FormData from 'form-data';

export async function POST(req) {
  console.log('Multiple Person Face Swap API 요청 시작');
  try {
    const contentType = req.headers.get('content-type');
    console.log('요청 Content-Type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      console.log('파일 업로드 요청 처리 중');
      const formData = await req.formData();
      const sourceImage = formData.get('source_image');
      const faceImages = formData.getAll('face_image');
      const index = JSON.parse(formData.get('index'));
      
      if (!sourceImage || faceImages.length === 0) {
        console.log('필요한 이미지 파일 없음');
        return NextResponse.json(
          { message: '소스 이미지와 얼굴 이미지가 모두 제공되어야 합니다.' },
          { status: 400 }
        );
      }
      
      console.log("sourceImage:", sourceImage);
      console.log("faceImages:", faceImages);
      console.log("index:", index);
      
      // FormData 생성
      const apiFormData = new FormData();
      
      // 소스 이미지 처리 - Buffer 사용
      const sourceBuffer = Buffer.from(await sourceImage.arrayBuffer());
      apiFormData.append('source_image', sourceBuffer, sourceImage.name);
      
      // 얼굴 이미지들 처리 - Buffer 사용
      for (const faceImage of faceImages) {
        const faceBuffer = Buffer.from(await faceImage.arrayBuffer());
        apiFormData.append('face_image', faceBuffer, faceImage.name);
      }
      
      // index 처리
      apiFormData.append('index', JSON.stringify(index));
      
      // 웹훅 처리
      apiFormData.append('webhook', 'https://face-webhook.vercel.app/api/task_callback');
      
      try {
        const response = await axios.post(
          'https://aifaceswap.io/api/aifaceswap/v1/multi_faceswap',
          apiFormData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.API_KEY}`,
              ...apiFormData.getHeaders()
            }
          }
        );
        
        console.log('API 응답:', response.data);
        return NextResponse.json(response.data);
      } catch (error) {
        console.error('aifaceswap API 호출 오류:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
          console.error('Error status:', error.response.status);
          console.error('Error headers:', error.response.headers);
        }
        return NextResponse.json({ message: 'aifaceswap API 호출 오류', error: error.message }, { status: 500 });
      }
    } else if (contentType.includes('application/json')) {
      // JSON 형식 요청 처리 (예제 URL 테스트용)
      const jsonData = await req.json();
      
      try {
        const response = await axios.post(
          'https://aifaceswap.io/api/aifaceswap/v1/multi_faceswap',
          jsonData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('API 응답:', response.data);
        return NextResponse.json(response.data);
      } catch (error) {
        console.error('aifaceswap API 호출 오류:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
          console.error('Error status:', error.response.status);
          console.error('Error headers:', error.response.headers);
        }
        return NextResponse.json({ message: 'aifaceswap API 호출 오류', error: error.message }, { status: 500 });
      }
    }
    
    console.log('지원되지 않는 콘텐츠 타입');
    return NextResponse.json(
      { message: '지원되지 않는 콘텐츠 타입입니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Multiple Person Face Swap API 오류:', error);
    console.error('오류 상세 정보:', error.response?.data || error.message);
    return NextResponse.json(
      { message: '서버 오류', error: error.message },
      { status: 500 }
    );
  }
}
