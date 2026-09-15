"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import {
  Download as DownloadIcon,
  Replay as ReplayIcon,
  Delete as DeleteIcon,
  AddReaction as AddReactionIcon,
  ViewStream as ViewStreamIcon,
  GridView as GridViewIcon,
  ViewModule as ViewModuleIcon,
  QrCode2 as QrCode2Icon,
  VideoCameraBack as VideoCameraBackIcon,
} from "@mui/icons-material";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import QRCode from "qrcode";

interface PhotoStripPreviewProps {
  images: string[];
  timelapseBlob?: Blob | null;
  onRetake: () => void;
}

interface PlacedSticker {
  id: string;
  emoji: string;
  xPercent: number;
  yPercent: number;
}

interface LayoutConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  cols: number;
  rows: number;
  canvasWidth: number;
  previewMaxWidth: number;
}

const LAYOUTS: LayoutConfig[] = [
  {
    id: "strip_1x4",
    name: "Dải dọc 1x4",
    icon: <ViewStreamIcon />,
    cols: 1,
    rows: 4,
    canvasWidth: 600,
    previewMaxWidth: 280,
  },
  {
    id: "grid_2x2",
    name: "Lưới vuông 2x2",
    icon: <GridViewIcon />,
    cols: 2,
    rows: 2,
    canvasWidth: 900,
    previewMaxWidth: 420,
  },
  {
    id: "wide_2x2",
    name: "Bưu thiếp ngang",
    icon: <ViewModuleIcon />,
    cols: 2,
    rows: 2,
    canvasWidth: 1100,
    previewMaxWidth: 480,
  },
];

const FRAME_COLORS = [
  { label: "Trắng", value: "#ffffff", textColor: "#222222" },
  { label: "Đen", value: "#1e1e1e", textColor: "#ffffff" },
  { label: "Hồng Pastel", value: "#ffe3ec", textColor: "#d81b60" },
  { label: "Xanh Pastel", value: "#e3f2fd", textColor: "#1565c0" },
  { label: "Tím Pastel", value: "#ede7f6", textColor: "#512da8" },
];

export default function PhotoStripPreview({
  images,
  timelapseBlob,
  onRetake,
}: PhotoStripPreviewProps) {
  const [selectedLayout, setSelectedLayout] = useState<LayoutConfig>(
    LAYOUTS[0],
  );
  const [selectedColor, setSelectedColor] = useState(FRAME_COLORS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null,
  );
  const [footerQrUrl, setFooterQrUrl] = useState<string>("");

  // Landing Page QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [shareQrCodeUrl, setShareQrCodeUrl] = useState<string>("");
  const [sharePageUrl, setSharePageUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Emoji Picker Popover
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(
    null,
  );

  const stripContainerRef = useRef<HTMLDivElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const generateFooterQR = async () => {
      try {
        const targetUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://photobool.app";
        const qrData = await QRCode.toDataURL(targetUrl, {
          width: 200,
          margin: 1,
          color: { dark: selectedColor.textColor, light: selectedColor.value },
        });
        setFooterQrUrl(qrData);
      } catch (err) {
        console.error("Failed to generate footer QR:", err);
      }
    };

    generateFooterQR();
  }, [selectedColor]);

  const handleOpenEmojiPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    setEmojiAnchorEl(e.currentTarget);
  };

  const handleCloseEmojiPicker = () => {
    setEmojiAnchorEl(null);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    const newSticker: PlacedSticker = {
      id: `${Date.now()}_${Math.random()}`,
      emoji: emojiData.emoji,
      xPercent: 40 + (Math.random() * 20 - 10),
      yPercent: 40 + (Math.random() * 20 - 10),
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
    handleCloseEmojiPicker();
  };

  const removeSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  const clearAllStickers = () => {
    setStickers([]);
    setSelectedStickerId(null);
  };

  const updateStickerPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingIdRef.current || !stripContainerRef.current) return;

      const rect = stripContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      setStickers((prev) =>
        prev.map((s) =>
          s.id === draggingIdRef.current ? { ...s, xPercent, yPercent } : s,
        ),
      );
    },
    [],
  );

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    draggingIdRef.current = id;
    setSelectedStickerId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdRef.current) {
      updateStickerPosition(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingIdRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture released
      }
      draggingIdRef.current = null;
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const renderStripCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const { cols, rows, canvasWidth } = selectedLayout;
    const padding = 32;
    const gap = 20;
    const footerHeight = 140;

    const photoWidth = (canvasWidth - padding * 2 - gap * (cols - 1)) / cols;
    const photoHeight = Math.round((photoWidth * 3) / 4);
    const canvasHeight =
      padding * 2 + photoHeight * rows + gap * (rows - 1) + footerHeight;

    const canvas = hiddenCanvasRef.current || document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    ctx.fillStyle = selectedColor.value;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < images.length; i++) {
      const img = await loadImage(images[i]);
      const colIndex = i % cols;
      const rowIndex = Math.floor(i / cols);

      const xPos = padding + colIndex * (photoWidth + gap);
      const yPos = padding + rowIndex * (photoHeight + gap);

      ctx.drawImage(img, xPos, yPos, photoWidth, photoHeight);
    }

    const footerY = padding + rows * photoHeight + (rows - 1) * gap + 20;
    const qrSize = 90;

    if (footerQrUrl) {
      const qrImg = await loadImage(footerQrUrl);
      ctx.drawImage(
        qrImg,
        canvasWidth - padding - qrSize,
        footerY + 10,
        qrSize,
        qrSize,
      );
    }

    ctx.fillStyle = selectedColor.textColor;
    ctx.textAlign = "left";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("PHOTOBOOL", padding + 10, footerY + 50);

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(
      today.getDate(),
    ).padStart(2, "0")}`;

    ctx.font = "500 20px sans-serif";
    ctx.fillText(dateStr, padding + 12, footerY + 85);

    ctx.font =
      '54px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    stickers.forEach((s) => {
      const canvasX = (s.xPercent / 100) * canvasWidth;
      const canvasY = (s.yPercent / 100) * canvasHeight;
      ctx.fillText(s.emoji, canvasX, canvasY);
    });

    return canvas;
  };

  const downloadPhotoStrip = async () => {
    try {
      setIsGenerating(true);
      const canvas = await renderStripCanvas();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `photobool_${selectedLayout.id}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export photo strip:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadTimelapse = () => {
    if (!timelapseBlob) return;
    const isMp4 = timelapseBlob.type.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const url = URL.createObjectURL(timelapseBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `photobool_timelapse_5s_${Date.now()}.${ext}`;
    link.click();
  };

  // Upload file helper
  const uploadFileToCloud = async (
    file: File | Blob,
    filename: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file, filename);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    if (!result.success || !result.url) {
      throw new Error(result.error || "Upload lên đám mây thất bại");
    }

    return result.url;
  };

  // One-Scan Landing Page for Mobile
  const handleOpenPhoneDownload = async () => {
    setIsQrModalOpen(true);
    setUploadError(null);

    if (shareQrCodeUrl) return;

    try {
      setIsUploading(true);

      // 1. Render photo canvas
      const canvas = await renderStripCanvas();
      if (!canvas) throw new Error('Không thể render ảnh');

      const photoBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!photoBlob) throw new Error('Lỗi chuyển đổi ảnh');

      // 2. Upload photo strip
      const photoCloudUrl = await uploadFileToCloud(photoBlob, `strip_${Date.now()}.png`);

      // 3. Upload timelapse if exists (use .mp4)
      let videoCloudUrl = '';
      if (timelapseBlob) {
        try {
          const isMp4 = timelapseBlob.type.includes('mp4');
          const ext = isMp4 ? 'mp4' : 'webm';
          videoCloudUrl = await uploadFileToCloud(timelapseBlob, `timelapse_${Date.now()}.${ext}`);
        } catch (e) {
          console.warn('Video upload skipped:', e);
        }
      }

      // 4. Generate Share Link embedding photo and video URLs directly
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://photobool.app';
      const queryParams = new URLSearchParams();
      queryParams.set('photo', photoCloudUrl);
      if (videoCloudUrl) {
        queryParams.set('video', videoCloudUrl);
      }

      const shareUrl = `${origin}/share?${queryParams.toString()}`;
      setSharePageUrl(shareUrl);

      // 5. Create QR Code
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 260,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      setShareQrCodeUrl(qr);
    } catch (err: unknown) {
      console.error('Share generation error:', err);
      setUploadError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo mã QR');
    } finally {
      setIsUploading(false);
    }
  };

  const isPickerOpen = Boolean(emojiAnchorEl);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: 2.5,
      }}
    >
      {/* Layout Selector */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" fontWeight="medium">
          Chọn kiểu bố cục:
        </Typography>
        <ToggleButtonGroup
          value={selectedLayout.id}
          exclusive
          onChange={(_, newId) => {
            if (newId) {
              const layout = LAYOUTS.find((l) => l.id === newId);
              if (layout) {
                setSelectedLayout(layout);
                setShareQrCodeUrl("");
              }
            }
          }}
          size="small"
        >
          {LAYOUTS.map((layout) => (
            <ToggleButton
              key={layout.id}
              value={layout.id}
              sx={{ px: 2, gap: 1 }}
            >
              {layout.icon}
              <Typography
                variant="body2"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                {layout.name}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Frame Color Picker */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" fontWeight="medium">
          Chọn màu khung ảnh:
        </Typography>
        <Stack direction="row" spacing={1.5}>
          {FRAME_COLORS.map((color) => (
            <Box
              key={color.value}
              onClick={() => {
                setSelectedColor(color);
                setShareQrCodeUrl("");
              }}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: color.value,
                border:
                  selectedColor.value === color.value
                    ? "3px solid #ff4081"
                    : "2px solid #ccc",
                cursor: "pointer",
                boxShadow: 1,
                transform:
                  selectedColor.value === color.value
                    ? "scale(1.15)"
                    : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Stickers Control */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddReactionIcon />}
          onClick={handleOpenEmojiPicker}
          sx={{ borderRadius: 8 }}
        >
          Kho nhãn dán ({stickers.length})
        </Button>

        {stickers.length > 0 && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              clearAllStickers();
              setShareQrCodeUrl("");
            }}
            sx={{ textTransform: "none" }}
          >
            Xóa hết
          </Button>
        )}

        <Popover
          open={isPickerOpen}
          anchorEl={emojiAnchorEl}
          onClose={handleCloseEmojiPicker}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          transformOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              handleEmojiSelect(emojiData);
              setShareQrCodeUrl("");
            }}
            searchPlaceHolder="Tìm sticker..."
          />
        </Popover>
      </Box>

      {/* Live Preview Area */}
      <Paper
        ref={stripContainerRef}
        elevation={6}
        onClick={() => setSelectedStickerId(null)}
        sx={{
          width: "100%",
          maxWidth: selectedLayout.previewMaxWidth,
          bgcolor: selectedColor.value,
          color: selectedColor.textColor,
          p: 2,
          borderRadius: 2,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          position: "relative",
          userSelect: "none",
          touchAction: "none",
          transition: "max-width 0.25s ease",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${selectedLayout.cols}, 1fr)`,
            gap: 1.5,
          }}
        >
          {images.map((src, index) => (
            <Box
              key={index}
              sx={{
                width: "100%",
                aspectRatio: "4 / 3",
                overflow: "hidden",
                borderRadius: 0.5,
                bgcolor: "#000",
                pointerEvents: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Strip ${index + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          ))}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pt: 2,
            pb: 0.5,
            px: 0.5,
            pointerEvents: "none",
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              letterSpacing={1.2}
              sx={{ color: "inherit", lineHeight: 1.2 }}
            >
              PHOTOBOOL
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "inherit", opacity: 0.8 }}
            >
              {new Date().toISOString().slice(0, 10).replace(/-/g, ".")}
            </Typography>
          </Box>

          {footerQrUrl && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={footerQrUrl}
                alt="Photobool QR"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </Box>
          )}
        </Box>

        {/* Placed Stickers */}
        {stickers.map((s) => {
          const isSelected = selectedStickerId === s.id;
          return (
            <Box
              key={s.id}
              onPointerDown={(e) => handlePointerDown(s.id, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              sx={{
                position: "absolute",
                left: `${s.xPercent}%`,
                top: `${s.yPercent}%`,
                transform: "translate(-50%, -50%)",
                fontSize: 32,
                cursor: "grab",
                lineHeight: 1,
                userSelect: "none",
                touchAction: "none",
                zIndex: 30,
                border: isSelected ? "2px dashed #ff4081" : "none",
                borderRadius: "50%",
                p: 0.5,
                "&:active": { cursor: "grabbing" },
              }}
            >
              {s.emoji}
              {isSelected && (
                <Tooltip title="Xóa nhãn dán này">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSticker(s.id);
                      setShareQrCodeUrl("");
                    }}
                    sx={{
                      position: "absolute",
                      top: -12,
                      right: -12,
                      bgcolor: "#ff1744",
                      color: "#fff",
                      width: 20,
                      height: 20,
                      fontSize: 12,
                      "&:hover": { bgcolor: "#d50000" },
                    }}
                  >
                    ✕
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Paper>

      {/* Action Buttons */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mt: 1 }}
      >
        <Button
          variant="contained"
          size="large"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={downloadPhotoStrip}
          disabled={isGenerating}
          sx={{ borderRadius: 8, px: 3, fontWeight: "bold" }}
        >
          {isGenerating ? "Đang tạo ảnh..." : "Tải ảnh về máy"}
        </Button>

        {timelapseBlob && (
          <Button
            variant="contained"
            size="large"
            color="success"
            startIcon={<VideoCameraBackIcon />}
            onClick={downloadTimelapse}
            sx={{ borderRadius: 8, px: 3, fontWeight: "bold" }}
          >
            Tải Timelapse 5s
          </Button>
        )}

        <Button
          variant="contained"
          size="large"
          color="secondary"
          startIcon={<QrCode2Icon />}
          onClick={handleOpenPhoneDownload}
          sx={{ borderRadius: 8, px: 3, fontWeight: "bold" }}
        >
          Quét QR nhận ảnh & video
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<ReplayIcon />}
          onClick={onRetake}
          disabled={isGenerating}
          sx={{ borderRadius: 8, px: 2 }}
        >
          Chụp lại
        </Button>
      </Stack>

      {/* Unified Landing Page QR Dialog */}
      <Dialog
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, textAlign: "center", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          📱 Nhận Ảnh & Video Trên Điện Thoại
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            pt: 0.5,
          }}
        >
          {isUploading ? (
            <Box
              sx={{
                py: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <CircularProgress color="secondary" />
              <Typography variant="body2" color="text.secondary">
                Đang gom trọn bộ ảnh & timelapse lên mây...
              </Typography>
            </Box>
          ) : uploadError ? (
            <Alert severity="error" sx={{ width: "100%" }}>
              {uploadError}
            </Alert>
          ) : (
            shareQrCodeUrl && (
              <>
                <Paper
                  elevation={3}
                  sx={{ p: 2, bgcolor: "#fff", borderRadius: 3 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shareQrCodeUrl}
                    alt="Photobool Landing QR"
                    style={{ width: 220, height: 220 }}
                  />
                </Paper>
                <Typography variant="body2" color="text.secondary">
                  Dùng Camera điện thoại quét mã này để mở{" "}
                  <b>Trang Nhận Kỷ Niệm Photobool</b> và bấm lưu trực tiếp vào
                  Thư Viện Ảnh!
                </Typography>
                {sharePageUrl && (
                  <Typography
                    variant="caption"
                    sx={{ wordBreak: "break-all", opacity: 0.6 }}
                  >
                    {sharePageUrl}
                  </Typography>
                )}
              </>
            )
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button
            onClick={() => setIsQrModalOpen(false)}
            sx={{ borderRadius: 8, px: 3 }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      <canvas ref={hiddenCanvasRef} style={{ display: "none" }} />
    </Box>
  );
}
