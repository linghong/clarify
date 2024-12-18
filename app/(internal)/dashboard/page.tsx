//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import Header from "@/app/(internal)/components/Header";
import MicControl from "./components/MicControl";
import MediaUploader from "./components/MediaUploader";
import ChatInput from "./components/ChatInput";
import MediaViewer from "./components/MediaViewer";
import ChatMessages from "./components/ChatMessages";

import { useAuthCheck } from "./hooks/useAuthCheck";
import { usePdfHandler } from "./hooks/usePdfHandler";
import { useVideoHandler } from "./hooks/useVideoHandler";
import { useAudioProcessing } from "@/app/(internal)/dashboard/hooks/useAudioProcessing";
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { captureVideoFrame } from "@/tools/frontend/captureVideoFrame";
import { AUDIO_CONFIG } from "@/types/audio";

interface UserData {
  id: number;
  email: string;
  name: string | null;
}

export default function DashboardPage() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTyping, setCurrentTyping] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('40px');

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<{ buffer: AudioBuffer; timestamp: number }[]>([]);
  const isPlayingRef = useRef(false);

  const { processAudioData, onAudioProcessed } = useAudioProcessing();
  const {
    videoUrl,
    setVideoUrl,
    showVideo,
    setShowVideo,
    handleVideoUpload,
    uploadedVideo,
    videoRef,
  } = useVideoHandler();

  const { mounted, loading } = useAuthCheck(setUserData, router);
  const {
    pdfUrl,
    pdfFileName,
    pdfContent,
    isPdfContentReady,
    setPdfContent,

    handlePdfChange,
    handlePdfTextExtracted
  } = usePdfHandler();

  // Add this useEffect before other effects
  useEffect(() => {
    return () => {
      audioQueueRef.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Initialize WebSocket connection after authentication
  const connectWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);

      wsRef.current.onopen = () => {
        setError(null); // Clear any previous connection errors
      };

      wsRef.current.onclose = () => {
        console.log('Clarify WebSocket connection closed');
        // Optionally attempt to reconnect
      };

      wsRef.current.onmessage = async (event) => {
        try {

          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'text':
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content += data.text;
                } else {
                  newMessages.push({ role: 'assistant', content: data.text });
                }
                return newMessages;
              });
              break;

            case 'text_done':
              setIsAIResponding(false);
              break;

            case 'audio_transcript':
              // Handle streaming transcript
              setTranscript(prev => prev + data.text);
              break;

            case 'transcript_done':
              // Handle complete transcript
              setMessages(prev => [
                ...prev,
                { role: 'assistant', content: data.text }
              ]);
              setTranscript(''); // Clear transcript buffer

              break;

            case 'audio_response':
              if (data.audio) {
                await playAudioChunk(data.audio, data.isEndOfSentence);
              }
              break;

            case 'audio_done':
              setIsAIResponding(false);
              break;

            case 'capture_screenshot':
              // Handle screenshot request
              handleSendScreentShotMessage(data.text, data.call_id);
              break;

            case 'error':
              setError(typeof data.error === 'object' ? data.error.message : data.error);
              setIsAIResponding(false);
              break;

            case 'audio_user_message':
              // Add user message to the messages array
              setMessages(prev => [
                ...prev,
                {
                  role: 'user',
                  content: data.text
                }
              ]);
              // Clear the transcript since we've now added it as a message
              setTranscript('');
              break;

            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          setError('Error processing server message');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setError('Failed to connect to server');
    }
  };

  const closeWebsocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const startRecording = async () => {

    if (!userData) return;

    connectWebSocket();

    try {
      // Initialize audio context and stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONFIG.AUDIO_CONSTRAINTS
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE
      });
      audioContextRef.current = audioContext;

      // Add the audio worklet module
      await audioContext.audioWorklet.addModule(AUDIO_CONFIG.AUDIO_WORKLET_PATH);

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      // Handle audio data from worklet
      workletNode.port.onmessage = async (event) => {
        if (event.data.eventType === 'audio') {
          if (event.data.eventType === 'audio') {
            await processAudioData(event.data.audioData);
            await onAudioProcessed((result) => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'audio',
                  audio: result.audio,
                  sampleRate: result.sampleRate,
                  endOfSpeech: result.endOfSpeech,
                  pdfContent,
                  pdfFileName // Include the file name
                }));
              }
            });
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      workletNodeRef.current = workletNode;

      // Initialize WebSocket if not already connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket(); //retry
      } else {
        setIsRecording(true);
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      // Stop the audio stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Disconnect and clean up worklet node
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Send end session event
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'end_audio_session'
        }));
      }

      setIsRecording(false);
      setTranscript('');

      closeWebsocket();

    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to stop recording');
      setIsRecording(false);
    }
  };

  // Updated playAudioChunk function
  const playAudioChunk = async (base64Audio: string, isEndOfSentence = false) => {
    try {
      // Decode base64 audio
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Initialize or resume AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({
          sampleRate: 24000
        });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Convert bytes to samples
      const samples = new Float32Array(bytes.length / 2);
      const dataView = new DataView(bytes.buffer);
      for (let i = 0; i < samples.length; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        samples[i] = int16 / 32768.0;
      }

      // Create AudioBuffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        samples.length,
        24000
      );
      audioBuffer.getChannelData(0).set(samples);

      // Adjust timing based on whether it's end of sentence
      const minBufferTime = isEndOfSentence ? 0.8 : 0.04; // Reduced buffer times
      const nextTimestamp = audioContextRef.current.currentTime +
        (audioQueueRef.current.length === 0 ? 0 : minBufferTime);

      audioQueueRef.current.push({
        buffer: audioBuffer,
        timestamp: nextTimestamp
      });

      // Start playing if not already playing
      if (!isPlayingRef.current) {
        playNextInQueue();
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  };

  // Add this new function to handle queue playback
  const playNextInQueue = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const nextAudio = audioQueueRef.current[0];
    const source = audioContextRef.current.createBufferSource();
    source.buffer = nextAudio.buffer;

    // Increase playback speed by 15%
    source.playbackRate.value = 1.;

    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      audioQueueRef.current.shift();
      if (audioQueueRef.current.length > 0) {
        playNextInQueue();
      } else {
        isPlayingRef.current = false;
      }
    };

    source.start(nextAudio.timestamp);
  };

  const handleSendScreentShotMessage = async (query: string, call_id: string) => {
    if (!wsRef.current) return;

    let screenshot;
    if (showVideo && videoRef.current) {
      screenshot = await captureVideoFrame(videoRef);
    } else {
      screenshot = await takeScreenshot();
    }

    if (!screenshot) {
      setError('Failed to capture screenshot');
      return;
    }

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: call_id === 'request_visual_content' ? 'text' : 'visual_query',
        text: query,
        pdfContent: pdfContent,
        messages: messages,
        base64ImageSrc: screenshot,
        call_id: call_id,
        isVideo: showVideo
      }));
      setIsAIResponding(true);
    }
  };

  async function handleSendMessage() {
    if (!currentTyping.trim()) return;
    setIsAIResponding(true);

    const messageText = currentTyping;

    // Clear input and reset height
    setCurrentTyping('');
    setTextareaHeight('40px'); // Reset to initial height

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: messageText
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText, // Use stored message text
          pdfContent,
          messages
        })
      });

      const data = await response.json();

      switch (data.type) {
        case 'text':
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.content
          }]);
          break;

        case 'request_screenshot':

          let screenshot;
          if (showVideo && videoRef.current) {
            screenshot = await captureVideoFrame(videoRef);
          } else {
            screenshot = await takeScreenshot();
          }

          if (!screenshot) {
            setError('Failed to capture screenshot');
            return;
          }

          const screenshotResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: data.question,
              base64ImageSrc: screenshot,
              messages: [...messages, { role: 'user', content: messageText }] // Include the latest message
            })
          });
          const screenshotData = await screenshotResponse.json();
          if (screenshotData.type === 'text') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: screenshotData.content
            }]);
          }
          break;

        case 'error':
          setError(data.message);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get response');
    } finally {
      setIsAIResponding(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header
        title="Dashboard"
        userName={userData?.name || userData?.email || ''}
        currentPage="dashboard"
      />
      <main className="flex-1 py-1">
        <div className="mx-auto px-2 max-w-[1920px] h-[calc(100vh-50px)]">
          <div className="flex gap-4 h-full">
            {(pdfUrl || showVideo) && (
              <div className="w-[65%] bg-white shadow rounded-lg overflow-hidden">
                <MediaViewer
                  setPdfContent={setPdfContent}
                  pdfUrl={pdfUrl}
                  videoUrl={videoUrl}
                  showVideo={showVideo}
                  setShowVideo={setShowVideo}
                  uploadedVideo={uploadedVideo}
                  setVideoUrl={setVideoUrl}
                  videoRef={videoRef}
                />
              </div>
            )}

            {/* Right column - Chat (1/3 width or full if no video/pdf) */}
            <div
              className={`${(pdfUrl || showVideo) ? 'w-[35%]' : 'w-full'
                } bg-white shadow rounded-lg flex flex-col min-w-[400px]`}
            >
              {/* Chat messages area */}
              <ChatMessages
                messages={messages}
                transcript={transcript}
              />
              <div className="border-t p-4">
                <div className={`flex ${(pdfUrl || showVideo) ? 'flex-col gap-3' : 'gap-2'}`}>
                  <MediaUploader
                    showVideo={showVideo}
                    pdfUrl={pdfUrl}
                    handlePdfChange={handlePdfChange}
                    handleVideoUpload={handleVideoUpload}
                  />
                  <ChatInput
                    textareaHeight={textareaHeight}
                    setTextareaHeight={setTextareaHeight}
                    currentTyping={currentTyping}
                    handleSendMessage={handleSendMessage}
                    setCurrentTyping={setCurrentTyping}
                    isAIResponding={isAIResponding}
                  />
                  <MicControl
                    isRecording={isRecording}
                    isAIResponding={isAIResponding}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}