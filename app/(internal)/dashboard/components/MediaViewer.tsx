import React from 'react';
import { Button } from "@/components/ui/button";
import PdfViewer from "@/components/PdfViewer";

interface MediaViewerProps {
  pdfUrl?: string | null;
  videoUrl?: string;
  uploadedVideo: File | null;
  setVideoUrl: (url: string) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  setPdfContent: (text: string) => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  pdfUrl,
  videoUrl,
  uploadedVideo,
  setVideoUrl,
  videoRef,
  setPdfContent
}) => {
  if (videoUrl) {
    // Show video
    return (
      <div className="flex flex-col h-full">
        <div className="relative w-full h-0 pb-[56.25%] bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute top-0 left-0 w-full h-full"
            crossOrigin="anonymous"
            controls
          />
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              onClick={() => {
                setVideoUrl('');
                if (uploadedVideo) {
                  URL.revokeObjectURL(videoUrl);
                }
              }}
              className="bg-emerald-600 hover:bg-red-600 text-white"
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
      <PdfViewer
        pdfUrl={pdfUrl}
        className="h-full w-full"
        onTextExtracted={(text) => {
          setPdfContent(text);
        }}
      />
    );
  }

  // If no media is available
  return null;
};

export default MediaViewer;
