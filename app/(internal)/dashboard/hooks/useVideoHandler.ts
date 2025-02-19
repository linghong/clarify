import { useState, useRef, useEffect } from 'react';

export function useVideoHandler() {
  const [videoUrl, setVideoUrl] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('videoUrl');
    }
    return null;
  });
  const [videoFileName, setVideoFileName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('videoFileName') || '';
    }
    return '';
  });

  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Persist state changes to localStorage
  useEffect(() => {
    if (videoUrl) {
      localStorage.setItem('videoUrl', videoUrl);
    } else {
      localStorage.removeItem('videoUrl');
    }
  }, [videoUrl]);

  useEffect(() => {
    if (videoFileName) {
      localStorage.setItem('videoFileName', videoFileName);
    } else {
      localStorage.removeItem('videoFileName');
    }
  }, [videoFileName]);

  const handleVideoChange = (url: string, fileName: string) => {
    setVideoUrl(url);
    setVideoFileName(fileName);
  };

  const clearVideo = () => {
    setVideoUrl(null);
    setVideoFileName('');
    setUploadedVideo(null);
    localStorage.removeItem('videoUrl');
    localStorage.removeItem('videoFileName');
  };

  return {
    videoUrl,
    videoFileName,
    uploadedVideo,
    videoRef,
    setVideoUrl,
    setUploadedVideo,
    handleVideoChange,
    clearVideo,
  };
}
