"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";

import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  PhotoCamera as PhotoCameraIcon,
  Replay as ReplayIcon,
  AutoFixHigh as AutoFixHighIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  FiberManualRecord as FiberManualRecordIcon,
} from "@mui/icons-material";
import PhotoSelectGrid from "./PhotoSelectGrid";
import PhotoStripPreview from "./PhotoStripPreview";
import { playBeepSound, playShutterSound } from "@/utils/soundEffects";
import { create5sTimelapse } from "@/utils/timelapseGenerator";

const TOTAL_SHOTS = 10;
const COUNTDOWN_SECONDS = 3;

interface FilterOption {
  id: string;
  name: string;
  css: string;
}

const PHOTO_FILTERS: FilterOption[] = [
  { id: "normal", name: "Tự nhiên", css: "none" },
  { id: "bw", name: "Đen trắng", css: "grayscale(100%) contrast(115%)" },
  {
    id: "vintage",
    name: "Cổ điển",
    css: "sepia(65%) contrast(95%) brightness(95%)",
  },
  {
    id: "vibrant",
    name: "Tươi sáng",
    css: "saturate(140%) brightness(105%) contrast(105%)",
  },
  {
    id: "dreamy",
    name: "Mộng mơ",
    css: "contrast(90%) brightness(115%) saturate(120%)",
  },
];

type BoothStep = "camera" | "select" | "preview";

export default function CameraBooth() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelapseSnapshotsRef = useRef<string[]>([]);
  const timelapseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);

  // Flow State
  const [currentStep, setCurrentStep] = useState<BoothStep>("camera");

  // Device & Mirror & Sound
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  // Filters
  const [activeFilter, setActiveFilter] = useState<FilterOption>(
    PHOTO_FILTERS[0],
  );

  // Shooting Session
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isProcessingTimelapse, setIsProcessingTimelapse] =
    useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentShot, setCurrentShot] = useState<number>(0);
  const [allCapturedPhotos, setAllCapturedPhotos] = useState<string[]>([]);
  const [finalSelectedPhotos, setFinalSelectedPhotos] = useState<string[]>([]);
  const [timelapseVideoBlob, setTimelapseVideoBlob] = useState<Blob | null>(
    null,
  );
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);

  const getCameraDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);

      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, [stream]);

  const startCamera = async (deviceId?: string) => {
    setErrorMsg(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    const targetDeviceId = deviceId || selectedDeviceId;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraOn(true);
      await getCameraDevices();
    } catch (err) {
      console.error("Failed to access camera:", err);
      setErrorMsg("Không thể mở Camera. Hãy kiểm tra kết nối thiết bị!");
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn("Auto-play was prevented:", err);
      });
    }
  }, [stream, isCameraOn, currentStep]);

  useEffect(() => {
    getCameraDevices();
    return () => {
      stopCamera();
    };
  }, []);

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.filter = activeFilter.css;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  const triggerFlash = () => {
    setIsFlashActive(true);
    setTimeout(() => {
      setIsFlashActive(false);
    }, 150);
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Sequence: Continuous snapshot sampling for Timelapse + 10 Photo Shots
  const startPhotoSession = async () => {
    if (!isCameraOn || isCapturing || !stream) return;

    setIsCapturing(true);
    setAllCapturedPhotos([]);
    setTimelapseVideoBlob(null);
    timelapseSnapshotsRef.current = [];

    // Continuous background snapshot taker: captures a lightweight frame every 200ms
    const video = videoRef.current;
    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = 640;
    snapCanvas.height = 480;
    const snapCtx = snapCanvas.getContext("2d");

    timelapseIntervalRef.current = setInterval(() => {
      if (video && snapCtx) {
        snapCtx.save();
        if (isMirrored) {
          snapCtx.translate(snapCanvas.width, 0);
          snapCtx.scale(-1, 1);
        }
        snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
        snapCtx.restore();
        timelapseSnapshotsRef.current.push(
          snapCanvas.toDataURL("image/jpeg", 0.7),
        );
      }
    }, 200);

    const images: string[] = [];

    for (let shot = 1; shot <= TOTAL_SHOTS; shot++) {
      setCurrentShot(shot);

      for (let sec = COUNTDOWN_SECONDS; sec > 0; sec--) {
        setCountdown(sec);
        if (isSoundEnabled) {
          playBeepSound();
        }
        await delay(1000);
      }

      setCountdown(null);
      triggerFlash();
      if (isSoundEnabled) {
        playShutterSound();
      }

      const photoUrl = captureFrame();
      if (photoUrl) {
        images.push(photoUrl);
        setAllCapturedPhotos([...images]);
      }

      if (shot < TOTAL_SHOTS) {
        await delay(1200);
      }
    }

    // Stop snapshot sampling
    if (timelapseIntervalRef.current) {
      clearInterval(timelapseIntervalRef.current);
      timelapseIntervalRef.current = null;
    }

    setIsCapturing(false);
    setCurrentShot(0);

    // Build 5-second fast-forward timelapse video
    setIsProcessingTimelapse(true);
    try {
      const videoBlob = await create5sTimelapse(timelapseSnapshotsRef.current);
      setTimelapseVideoBlob(videoBlob);
    } catch (err) {
      console.warn("Failed to generate timelapse:", err);
    } finally {
      setIsProcessingTimelapse(false);
    }

    setCurrentStep("select");
  };

  const handleRetakeAll = () => {
    setAllCapturedPhotos([]);
    setFinalSelectedPhotos([]);
    setTimelapseVideoBlob(null);
    setCurrentStep("camera");
  };

  // STEP 2: Selection Screen
  if (currentStep === "select") {
    return (
      <PhotoSelectGrid
        photos={allCapturedPhotos}
        maxSelect={4}
        onConfirm={(selected) => {
          setFinalSelectedPhotos(selected);
          setCurrentStep("preview");
        }}
        onRetake={handleRetakeAll}
      />
    );
  }

  // STEP 3: Preview & Decorate Screen
  if (currentStep === "preview") {
    return (
      <PhotoStripPreview
        images={finalSelectedPhotos}
        timelapseBlob={timelapseVideoBlob}
        onRetake={handleRetakeAll}
      />
    );
  }

  // STEP 1: Live Camera Screen
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: 2,
      }}
    >
      {errorMsg && (
        <Alert severity="error" sx={{ width: "100%", maxWidth: 640 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Controls Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          width: "100%",
          maxWidth: 640,
        }}
      >
        <FormControl size="small" fullWidth disabled={isCapturing}>
          <InputLabel id="camera-select-label">Chọn Camera</InputLabel>
          <Select
            labelId="camera-select-label"
            value={selectedDeviceId}
            label="Chọn Camera"
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedDeviceId(newId);
              if (isCameraOn) {
                startCamera(newId);
              }
            }}
          >
            {devices.map((device, index) => (
              <MenuItem key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={isMirrored}
              disabled={isCapturing}
              onChange={(e) => setIsMirrored(e.target.checked)}
            />
          }
          label="Lật"
          sx={{ whiteSpace: "nowrap" }}
        />

        <Tooltip title={isSoundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}>
          <IconButton
            color={isSoundEnabled ? "primary" : "default"}
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            disabled={isCapturing}
          >
            {isSoundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main Viewport */}
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 640,
          aspectRatio: "4 / 3",
          bgcolor: "#1a1a1a",
          borderRadius: 4,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {isCameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: isMirrored ? "scaleX(-1)" : "none",
              filter: activeFilter.css,
              transition: "filter 0.25s ease",
            }}
          />
        ) : (
          <Box sx={{ textAlign: "center", color: "#888", p: 3 }}>
            <VideocamOffIcon sx={{ fontSize: 64, mb: 1, opacity: 0.6 }} />
            <Typography variant="body1">
              Camera đang tắt. Hãy bấm Bật Camera bên dưới!
            </Typography>
          </Box>
        )}

        {isFlashActive && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "#fff",
              zIndex: 20,
              opacity: 0.9,
              transition: "opacity 0.15s ease-out",
            }}
          />
        )}

        {countdown !== null && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.35)",
              zIndex: 10,
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: 80, sm: 120 },
                fontWeight: 900,
                color: "#fff",
                textShadow: "0 4px 20px rgba(0,0,0,0.6)",
              }}
            >
              {countdown}
            </Typography>
          </Box>
        )}

        {/* Live Recording Badge */}
        {isCapturing && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}
          >
            <Chip
              label={`Ảnh ${currentShot} / ${TOTAL_SHOTS}`}
              color="primary"
              sx={{ fontWeight: "bold" }}
            />
            <Chip
              icon={
                <FiberManualRecordIcon sx={{ color: "#ff1744 !important" }} />
              }
              label="Quay Timelapse 5s"
              sx={{
                bgcolor: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontWeight: "bold",
              }}
            />
          </Stack>
        )}

        {/* Timelapse Processing Overlay */}
        {isProcessingTimelapse && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0,0,0,0.7)",
              zIndex: 25,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: "#fff",
            }}
          >
            <CircularProgress color="inherit" />
            <Typography variant="body1" fontWeight="bold">
              Đang tua nhanh tạo video Timelapse 5s...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Filter Selector */}
      {isCameraOn && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: "100%",
            maxWidth: 640,
            overflowX: "auto",
            py: 0.5,
          }}
        >
          <AutoFixHighIcon color="action" sx={{ mr: 0.5 }} />
          <Stack direction="row" spacing={1}>
            {PHOTO_FILTERS.map((filter) => {
              const isSelected = activeFilter.id === filter.id;
              return (
                <Chip
                  key={filter.id}
                  label={filter.name}
                  clickable={!isCapturing}
                  color={isSelected ? "primary" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                  onClick={() => !isCapturing && setActiveFilter(filter)}
                  sx={{ fontWeight: isSelected ? "bold" : "normal", px: 0.5 }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
        {!isCameraOn ? (
          <Button
            variant="contained"
            size="large"
            color="primary"
            startIcon={<VideocamIcon />}
            onClick={() => startCamera()}
            sx={{ borderRadius: 8, px: 4 }}
          >
            Bật Camera
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              size="large"
              color="primary"
              startIcon={<PhotoCameraIcon />}
              onClick={startPhotoSession}
              disabled={isCapturing || isProcessingTimelapse}
              sx={{ borderRadius: 8, px: 4, fontWeight: "bold" }}
            >
              {isCapturing
                ? "Đang chụp & tạo timelapse..."
                : "Bắt đầu chụp (10 kiểu)"}
            </Button>

            {allCapturedPhotos.length > 0 && !isCapturing && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<ReplayIcon />}
                onClick={handleRetakeAll}
                sx={{ borderRadius: 8 }}
              >
                Chụp lại
              </Button>
            )}

            <Button
              variant="text"
              color="error"
              onClick={stopCamera}
              disabled={isCapturing}
              sx={{ borderRadius: 8 }}
            >
              Tắt Cam
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
