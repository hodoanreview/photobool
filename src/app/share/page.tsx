'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function ShareContent() {
  const searchParams = useSearchParams();
  const photoUrl = searchParams.get('photo');
  const videoUrl = searchParams.get('video');

  const handleSaveToPhotoApp = async (url: string, filename: string, type: 'image' | 'video') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const mimeType = type === 'image' ? 'image/png' : 'video/webm';
      const file = new File([blob], filename, { type: mimeType });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Photobool Photo',
          text: 'Ảnh kỷ niệm Photobool của tôi!',
        });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.click();
      }
    } catch (err) {
      console.warn('Share error or canceled:', err);
    }
  };

  if (!photoUrl) {
    return (
      <Container maxWidth="xs" sx={{ py: 6, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Không tìm thấy liên kết ảnh.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Vui lòng quét lại mã QR tại quầy Photobool!
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          📸 PHOTOBOOL
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Kỷ niệm của bạn đã sẵn sàng lưu vào máy!
        </Typography>
      </Box>

      {/* Dải Ảnh */}
      <Paper elevation={4} sx={{ p: 2, borderRadius: 3, width: '100%', textAlign: 'center', bgcolor: '#fff' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Photobool Strip"
          style={{ width: '100%', borderRadius: 8, maxHeight: 420, objectFit: 'contain' }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
          💡 Mẹo: Nhấn giữ 1 giây vào ảnh rồi chọn &quot;Lưu vào Ảnh&quot;
        </Typography>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<ShareIcon />}
          onClick={() => handleSaveToPhotoApp(photoUrl, `photobool_${Date.now()}.png`, 'image')}
          sx={{ mt: 1.5, borderRadius: 8, py: 1.2, fontWeight: 'bold' }}
        >
          Lưu Dải Ảnh vào Thư Viện
        </Button>
      </Paper>

      {/* Video Timelapse */}
      {videoUrl && (
        <Paper elevation={4} sx={{ p: 2, borderRadius: 3, width: '100%', textAlign: 'center', bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
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
            style={{ width: '100%', borderRadius: 8, maxHeight: 240, objectFit: 'cover' }}
          />

          <Button
            variant="contained"
            color="secondary"
            fullWidth
            startIcon={<DownloadIcon />}
            onClick={() => handleSaveToPhotoApp(videoUrl, `timelapse_${Date.now()}.webm`, 'video')}
            sx={{ mt: 1.5, borderRadius: 8, py: 1.2, fontWeight: 'bold' }}
          >
            Lưu Video vào Thư Viện
          </Button>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" align="center" sx={{ pb: 3 }}>
        Cảm ơn bạn đã chụp ảnh tại Photobool! 💖
      </Typography>
    </Container>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      }
    >
      <ShareContent />
    </Suspense>
  );
}