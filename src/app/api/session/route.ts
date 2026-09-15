import { NextRequest, NextResponse } from "next/server";

// In-memory cache for demo/session downloads (stores for 24h)
const sessionStore = new Map<
  string,
  { photoUrl: string; videoUrl?: string; createdAt: number }
>();

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, videoUrl } = await req.json();

    if (!photoUrl) {
      return NextResponse.json(
        { success: false, error: "Thiếu photoUrl" },
        { status: 400 },
      );
    }

    // Generate short random session ID
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    sessionStore.set(sessionId, {
      photoUrl,
      videoUrl,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error("Save session error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !sessionStore.has(id)) {
    return NextResponse.json(
      { success: false, error: "Phiên chụp đã hết hạn hoặc không tồn tại" },
      { status: 404 },
    );
  }

  const data = sessionStore.get(id);
  return NextResponse.json({ success: true, data });
}
