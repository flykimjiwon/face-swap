//apipextract-face/route.js
import axios from 'axios';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  console.log('얼굴 추출 API 요청 시작');
  try {
    const contentType = req.headers.get('content-type');
    console.log('요청 Content-Type:', contentType);

    if (contentType === 'application/json') {
      const { img } = await req.json();
      console.log('JSON 요청 처리 중');
      const response = await axios.post(
        'https://aifaceswap.io/api/aifaceswap/v1/extract_face',
        { img },
        {
          headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('API 응답:', response.data);
      return NextResponse.json(response.data);
    } 
    else if (contentType.includes('multipart/form-data')) {
      console.log('파일 업로드 요청 처리 중');
      const formData = await req.formData();
      const file = formData.get('img');
      
      if (!file) {
        console.log('이미지 파일 없음');
        return NextResponse.json(
          { message: '이미지 파일이 제공되지 않았습니다.' },
          { status: 400 }
        );
      }
      
      console.log('파일 정보:', file.name, file.type, file.size);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const tempDir = join(process.cwd(), 'tmp');
      const filePath = join(tempDir, `${uuidv4()}-${file.name}`);
      
      try {
        await mkdir(tempDir, { recursive: true });
        console.log('임시 디렉토리 생성 또는 확인됨:', tempDir);
      } catch (mkdirError) {
        console.error('임시 디렉토리 생성 중 오류:', mkdirError);
        throw mkdirError;
      }
      
      try {
        await writeFile(filePath, buffer);
        console.log('임시 파일 저장됨:', filePath);
      } catch (writeError) {
        console.error('파일 저장 중 오류:', writeError);
        throw writeError;
      }

      const apiFormData = new FormData();
      apiFormData.append('img', new Blob([buffer], { type: file.type }), file.name);
      
      const response = await axios.post(
        'https://aifaceswap.io/api/aifaceswap/v1/extract_face',
        apiFormData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('API 응답:', response.data);
      return NextResponse.json(response.data);
    }
    
    console.log('지원되지 않는 콘텐츠 타입');
    return NextResponse.json(
      { message: '지원되지 않는 콘텐츠 타입입니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('얼굴 추출 API 오류:', error);
    console.error('오류 상세 정보:', error.response?.data || error.message);
    return NextResponse.json(
      { message: '서버 오류', error: error.message },
      { status: 500 }
    );
  }
}
