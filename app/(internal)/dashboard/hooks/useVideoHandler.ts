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
  const [showVideo, setShowVideo] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showVideo') === 'true';
    }
    return false;
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

  useEffect(() => {
    localStorage.setItem('showVideo', String(showVideo));
  }, [showVideo]);

  const handleVideoChange = (url: string, fileName: string, courseId?: string, lessonId?: string) => {
    setVideoUrl(url);
    setVideoFileName(fileName);
    setShowVideo(true);
  };

  const clearVideo = () => {
    setVideoUrl(null);
    setVideoFileName('');
    setShowVideo(false);
    setUploadedVideo(null);
    localStorage.removeItem('videoUrl');
    localStorage.removeItem('videoFileName');
    localStorage.removeItem('showVideo');
  };

  const clearVideoOnPdfLoad = () => {
    clearVideo();
  };

  return {
    videoUrl,
    videoFileName,
    showVideo,
    uploadedVideo,
    videoRef,
    setVideoUrl,
    setShowVideo,
    setUploadedVideo,
    handleVideoChange,
    clearVideo,
    clearVideoOnPdfLoad,
  };
}
