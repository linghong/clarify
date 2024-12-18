import { useRef, useState, useEffect } from 'react';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function useVideoHandler() {
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const validateVideo = (file: File): { isValid: boolean; error: string } => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Please upload a valid video file.' };
    }
    if (file.size > MAX_VIDEO_SIZE) {
      return { isValid: false, error: 'Video is too large (max 100MB).' };
    }
    return { isValid: true, error: '' };
  };

  const handleVideoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setError?: (msg: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateVideo(file);
    if (!validation.isValid) {
      if (setError) setError(validation.error);
      event.target.value = '';
      return;
    }
    setUploadedVideo(file);
    setVideoUrl(URL.createObjectURL(file));
    setShowVideo(true);
    event.target.value = '';
  };

  useEffect(() => {
    return () => {
      if (uploadedVideo) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [uploadedVideo, videoUrl]);


  return {
    uploadedVideo,
    setUploadedVideo,
    videoUrl,
    setVideoUrl,
    showVideo,
    setShowVideo,
    videoRef,
    handleVideoUpload,
  };
}
