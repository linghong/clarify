import React, { RefObject, FC, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import ScrollView from '@/components/ScrollView';
import { updateResourceStatusInDB } from '@/lib/updateResourceStatusInDB';

interface MediaViewerProps {
  pdfUrl?: string | null;
  videoUrl?: string;
  uploadedVideo: File | null;
  setVideoUrl: (url: string) => void;
  videoRef: RefObject<HTMLVideoElement>;
  setPdfContent: (text: string) => void;
  resourceId?: number;
  lessonId?: number;
}

const MediaViewer: FC<MediaViewerProps> = ({
  pdfUrl,
  videoUrl,
  uploadedVideo,
  setVideoUrl,
  videoRef,
  setPdfContent,
  resourceId = 0,
  lessonId = 0
}) => {
  const resourceType = videoUrl ? 'video' : pdfUrl ? 'pdf' : 'lesson';

  useEffect(() => {
    // Only trigger timer for PDFs and videos, not for lessons
    if (resourceType !== 'lesson' && resourceId > 0) {
      // Set a small delay to mark as 'in_progress'
      const timer = setTimeout(() => {
        updateResourceStatusInDB(resourceType, resourceId, 'in_progress', lessonId);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [resourceType, resourceId, lessonId]);

  // Set up video play listener
  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && resourceType === 'video' && resourceId > 0) {
      const handlePlay = () => {
        updateResourceStatusInDB('video', resourceId, 'in_progress', lessonId);
      };

      videoElement.addEventListener("playing", handlePlay);

      return () => {
        videoElement.removeEventListener("playing", handlePlay);
      };
    }
  }, [videoRef, resourceType, resourceId, lessonId]);

  if (videoUrl) {
    // Show video
    return (
      <div className="flex flex-col ">
        <div className="relative w-full">
          <div className="aspect-video w-full bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              controls
            />
          </div>
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              onClick={() => {
                setVideoUrl('');
                if (uploadedVideo) {
                  URL.revokeObjectURL(videoUrl);
                }
              }}
              className="bg-gray-200 hover:bg-gray-300 text-black"
            >
              Close Video
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (pdfUrl) {
    // Show PDF viewer
    return (
      <div className="h-full w-full">
        <ScrollView
          pdfUrl={pdfUrl}
          onTextExtracted={(text) => {
            setPdfContent(text);
          }}
          resourceId={resourceId}
        />
      </div >
    );
  }

  // If no media is available
  return null;
};

export default MediaViewer;
