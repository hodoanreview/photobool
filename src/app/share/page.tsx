"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

function ShareContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Mã phiên chụp không hợp lệ");
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/session?id=${sessionId}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Không tìm thấy ảnh");
        }

        setPhotoUrl(data.data.photoUrl);
        setVideoUrl(data.data.videoUrl || null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Native Save/Share directly to Phone's Photo App
  const handleSaveToPhotoApp = async (
    url: string,
    filename: string,
    type: "image" | "video",
  ) => {
    try {
      // Fetch the file blob
      const response = await fetch(url);
      const blob = await response.blob();
      const mimeType = type === "image" ? "image/png" : "video/webm";
      const file = new File([blob], filename, { type: mimeType });

      // Check if phone supports Web Share API with files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Photobool Photo",
          text: "Ảnh kỷ niệm Photobool của tôi!",
        });
      } else {
        // Fallback for browsers that don't support file share
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.click();
      }
    } catch (err) {
      console.warn("Share error or canceled:", err);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          Đang tải kỷ niệm của bạn...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xs" sx={{ py: 6, textAlign: "center" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Vui lòng quét lại mã QR tại quầy photobooth!
        </Typography>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xs"
      sx={{
        py: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      {/* Branding Header */}
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          📸 PHOTOBOOL
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Kỷ niệm của bạn đã sẵn sàng lưu vào máy!
        </Typography>
      </Box>

      {/* Photo Strip Card */}
      {photoUrl && (
        <Paper
          elevation={4}
          sx={{
            p: 2,
            borderRadius: 3,
            width: "100%",
            textAlign: "center",
            bgcolor: "#fff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Photobool Strip"
            style={{
              width: "100%",
              borderRadius: 8,
              maxHeight: 420,
              objectFit: "contain",
            }}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1, fontStyle: "italic" }}
          >
            💡 Mẹo: Nhấn giữ 1 giây vào ảnh rồi chọn &quot;Lưu vào Ảnh&quot;
          </Typography>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<ShareIcon />}
            onClick={() =>
              handleSaveToPhotoApp(
                photoUrl,
                `photobool_${Date.now()}.png`,
                "image",
              )
            }
            sx={{ mt: 1.5, borderRadius: 8, py: 1.2, fontWeight: "bold" }}
          >
            Lưu Dải Ảnh vào Thư Viện
          </Button>
        </Paper>
      )}

      {/* Timelapse Video Card */}
      {videoUrl && (
        <Paper
          elevation={4}
          sx={{
            p: 2,
            borderRadius: 3,
            width: "100%",
            textAlign: "center",
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <AutoAwesomeIcon color="secondary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="bold">
              Video Hậu Trường Timelapse 5s
            </Typography>
          </Box>

          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            controls
            style={{
              width: "100%",
              borderRadius: 8,
              maxHeight: 240,
              objectFit: "cover",
            }}
          />

          <Button
            variant="contained"
            color="secondary"
            fullWidth
            startIcon={<DownloadIcon />}
            onClick={() =>
              handleSaveToPhotoApp(
                videoUrl,
                `timelapse_${Date.now()}.webm`,
                "video",
              )
            }
            sx={{ mt: 1.5, borderRadius: 8, py: 1.2, fontWeight: "bold" }}
          >
            Lưu Video vào Thư Viện
          </Button>
        </Paper>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        align="center"
        sx={{ pb: 3 }}
      >
        Cảm ơn bạn đã chụp ảnh tại Photobool! 💖
      </Typography>
    </Container>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
