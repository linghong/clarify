import { useState, useRef } from 'react';

export function useVideoHandler() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoChange = (url: string, fileName: string) => {
    setVideoUrl(url);
    setVideoFileName(fileName);
  };

  const clearVideo = () => {
    setVideoUrl(null);
    setVideoFileName('');
    setUploadedVideo(null);
  };

  return {
    videoFileName,
    uploadedVideo,
    videoRef,
    videoUrl,
    setVideoUrl,
    setUploadedVideo,
    handleVideoChange,
    clearVideo,
  };
}
