import { useState, useRef } from 'react';

export function useVideoHandler() {
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoChange = (url: string, fileName: string) => {
    setVideoFileUrl(url);
    setVideoFileName(fileName);
  };

  const clearVideo = () => {
    setVideoFileUrl(null);
    setVideoFileName('');
    setUploadedVideo(null);
  };

  return {
    videoFileName,
    uploadedVideo,
    videoRef,
    videoFileUrl,
    setVideoFileUrl,
    setUploadedVideo,
    handleVideoChange,
    clearVideo,
  };
}
