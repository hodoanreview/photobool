"use client";

import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import {
  CheckCircle as CheckCircleIcon,
  Replay as ReplayIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";

interface PhotoSelectGridProps {
  photos: string[];
  maxSelect?: number;
  onConfirm: (selectedPhotos: string[]) => void;
  onRetake: () => void;
}

export default function PhotoSelectGrid({
  photos,
  maxSelect = 4,
  onConfirm,
  onRetake,
}: PhotoSelectGridProps) {
  // Store indices of selected photos in the order of user selection
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleSelect = (index: number) => {
    if (selectedIndices.includes(index)) {
      // Unselect and re-order remaining
      setSelectedIndices((prev) => prev.filter((i) => i !== index));
    } else {
      if (selectedIndices.length < maxSelect) {
        setSelectedIndices((prev) => [...prev, index]);
      }
    }
  };

  const handleContinue = () => {
    if (selectedIndices.length === maxSelect) {
      const selectedPhotos = selectedIndices.map((i) => photos[i]);
      onConfirm(selectedPhotos);
    }
  };

  const isComplete = selectedIndices.length === maxSelect;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: 3,
      }}
    >
      {/* Title & Selection status indicator */}
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom color="primary">
          Chọn {maxSelect} bức ảnh đẹp nhất của bạn
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bấm vào ảnh để chọn theo thứ tự xuất hiện trên dải ảnh (từ trên xuống
          dưới)
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <Chip
            color={isComplete ? "success" : "primary"}
            label={`Đã chọn ${selectedIndices.length} / ${maxSelect} ảnh`}
            icon={isComplete ? <CheckCircleIcon /> : undefined}
            sx={{ fontWeight: "bold", px: 1 }}
          />
        </Box>
      </Box>

      {/* 10-Photos Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" },
          gap: 2,
          width: "100%",
          maxWidth: 820,
        }}
      >
        {photos.map((src, index) => {
          const selectionOrder = selectedIndices.indexOf(index);
          const isSelected = selectionOrder !== -1;

          return (
            <Paper
              key={index}
              elevation={isSelected ? 8 : 2}
              onClick={() => toggleSelect(index)}
              sx={{
                aspectRatio: "4 / 3",
                position: "relative",
                overflow: "hidden",
                borderRadius: 2,
                cursor: "pointer",
                border: "3px solid",
                borderColor: isSelected ? "primary.main" : "transparent",
                transform: isSelected ? "scale(1.03)" : "scale(1)",
                transition: "all 0.15s ease-in-out",
                "&:hover": {
                  borderColor: isSelected ? "primary.main" : "#ccc",
                  transform: "scale(1.02)",
                },
              }}
            >
              {/* Photo Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Captured frame ${index + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />

              {/* Selection Badge with Order Number (1, 2, 3, 4) */}
              {isSelected ? (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "primary.main",
                    color: "#fff",
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: 16,
                    boxShadow: 2,
                  }}
                >
                  {selectionOrder + 1}
                </Box>
              ) : (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "rgba(0,0,0,0.4)",
                    color: "#fff",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  {index + 1}
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          endIcon={<ArrowForwardIcon />}
          onClick={handleContinue}
          disabled={!isComplete}
          sx={{ borderRadius: 8, px: 4, fontWeight: "bold" }}
        >
          {isComplete
            ? "Tiếp tục trang trí"
            : `Chọn thêm ${maxSelect - selectedIndices.length} ảnh`}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ReplayIcon />}
          onClick={onRetake}
          sx={{ borderRadius: 8, px: 3 }}
        >
          Chụp lại tất cả
        </Button>
      </Stack>
    </Box>
  );
}
