import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy file" },
        { status: 400 },
      );
    }

    // Forward file to temporary cloud storage (tmpfiles.org)
    const uploadBody = new FormData();
    uploadBody.append("file", file);

    const res = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: uploadBody,
    });

    const result = await res.json();

    if (result.status !== "success" || !result.data?.url) {
      return NextResponse.json(
        { success: false, error: "Upload lên đám mây thất bại" },
        { status: 502 },
      );
    }

    // Convert preview link to direct download link (e.g. https://tmpfiles.org/123/name -> https://tmpfiles.org/dl/123/name)
    const directUrl = result.data.url.replace(
      "https://tmpfiles.org/",
      "https://tmpfiles.org/dl/",
    );

    return NextResponse.json({
      success: true,
      url: directUrl,
    });
  } catch (error) {
    console.error("API Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi máy chủ nội bộ" },
      { status: 500 },
    );
  }
}
