import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 400 });
    }

    // Upload to Litterbox (Catbox temporary storage - lasts 24h, 100% free, direct link, no CORS block)
    const uploadBody = new FormData();
    uploadBody.append('reqtype', 'fileupload');
    uploadBody.append('time', '24h'); // Lưu trữ 24 giờ - quá đủ để khách tải về máy
    uploadBody.append('fileToUpload', file);

    const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: uploadBody,
    });

    const directUrl = (await res.text()).trim();

    if (!directUrl.startsWith('https://')) {
      return NextResponse.json({ success: false, error: 'Upload thất bại' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      url: directUrl, // Link trực tiếp dạng https://litter.catbox.moe/xyz.png hoặc .webm
    });
  } catch (error) {
    console.error('API Upload error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}