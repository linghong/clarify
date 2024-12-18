import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, MicOff } from "lucide-react";

interface MicControlProps {
  isRecording: boolean;
  isAIResponding: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

const MicControl: React.FC<MicControlProps> = ({
  isRecording,
  isAIResponding,
  startRecording,
  stopRecording
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => isRecording ? stopRecording() : startRecording()}
            className={`${isRecording
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-red-200 hover:bg-red-400'
              } text-white shrink-0`}
            disabled={isAIResponding}
          >
            {isRecording ? <Mic /> : <MicOff />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isRecording ? 'Stop Recording' : 'Start Recording'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MicControl;
