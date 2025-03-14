import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, MicOff } from "lucide-react";

interface MicControlProps {
  isRecording: boolean;
  isAIResponding: boolean;
  turnOnMic: () => Promise<void>;
  turnOffMic: () => Promise<void>;
}

const MicControl: React.FC<MicControlProps> = ({
  isRecording,
  isAIResponding,
  turnOnMic,
  turnOffMic
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            role="switch"
            aria-checked={isRecording}
            onClick={() => isRecording ? turnOffMic() : turnOnMic()}
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
          <p>{isRecording ? 'Stop Voice Chat' : 'Start Voice Chat'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MicControl;
