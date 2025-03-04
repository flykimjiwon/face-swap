import axios from 'axios';
import { NextResponse } from 'next/server';

export async function POST(req) {
  console.log('테스트용 Multi Face Swap API 요청 시작');
  try {
    const response = await axios.post(
      'https://aifaceswap.io/api/aifaceswap/v1/multi_faceswap',
      {
        source_image: "https://temp.aifaceswap.io/aifaceswap/static_img/1f153b1ab8d134f1eff57eb527467137.webp",
        face_image: [
          "https://temp.aifaceswap.io/aifaceswap/static_img/8a1bce5ea303791589165a5f607e7399.webp"
        ],
        index: [0],
        webhook: "https://face-webhook.vercel.app/api/task_callback"
      }
      ,
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
    console.error('multi_faceswap API 호출 오류:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
    }
    return NextResponse.json(
      { message: 'multi_faceswap API 호출 오류', error: error.message }, 
      { status: 500 }
    );
  }
}
