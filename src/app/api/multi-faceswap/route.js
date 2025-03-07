//api/multi-faceswap.route.js
import axios from 'axios';
import { NextResponse } from 'next/server';

export async function POST(req) {
  console.log('테스트용 Multi Face Swap API 요청 시작');
  try {
    const formData = await req.formData();
    const sourceImage = formData.get('source_image');
    const faceImages = formData.getAll('face_image');
    const index = JSON.parse(formData.get('index'));

    const payload = {
      source_image: {
        name: sourceImage.name,
        data: Buffer.from(await sourceImage.arrayBuffer()).toString('base64')
      },
      face_image: await Promise.all(faceImages.map(async (faceImage) => ({
        name: faceImage.name,
        data: Buffer.from(await faceImage.arrayBuffer()).toString('base64')
      }))),
      index: index,
      webhook: 'https://face-webhook.vercel.app/api/task_callback'
    };

    const response = await axios.post(
      'https://aifaceswap.io/api/aifaceswap/v1/multi_faceswap',
      payload,
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
