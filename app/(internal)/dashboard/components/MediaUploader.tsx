import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Video as VideoIcon } from "lucide-react";
import PdfUploader from "@/components/PdfUploader";

interface MediaUploaderProps {
  pdfUrl: string | null;
  handlePdfChange: (url: string, fileName: string) => void;
  handleVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showVideo: boolean;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  pdfUrl,
  handlePdfChange,
  handleVideoUpload,
  showVideo
}) => {
  return (
    <div className={`flex gap-2 ${!(pdfUrl || showVideo) && 'order-first'}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <PdfUploader
                onPdfChange={handlePdfChange}
                hasActivePdf={!!pdfUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Upload className="h-4 w-4" />
              </PdfUploader>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload PDF</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideoUpload(e)}
                  className="hidden"
                  id="video-upload"
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById('video-upload')?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <VideoIcon className="h-4 w-4" />
                </Button>
              </label>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload Video (max 100MB)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default MediaUploader;
