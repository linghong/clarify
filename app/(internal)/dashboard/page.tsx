//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import Header from "@/app/(internal)/components/Header";
import ChatInput from "@/app/(internal)/dashboard/components/ChatInput";
import ChatMessages from "@/app/(internal)/dashboard/components/ChatMessages";
import MediaUploader from "@/app/(internal)/dashboard/components/MediaUploader";
import MediaViewer from "@/app/(internal)/dashboard/components/MediaViewer";
import MicControl from "@/app/(internal)/dashboard/components/MicControl";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { usePdfHandler } from "@/app/(internal)/dashboard/hooks/usePdfHandler";
import { useVideoHandler } from "@/app/(internal)/dashboard/hooks/useVideoHandler";
import { useAudioRecording } from "@/app/(internal)/dashboard/hooks/useAudioRecording";
import { useAudioStreaming } from "@/app/(internal)/dashboard/hooks/useAudioStreaming";

import { AUDIO_CONFIG } from '@/lib/audioutils';
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { captureVideoFrame } from "@/tools/frontend/captureVideoFrame";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserData } from "@/types/auth";
import { ChatMessage } from "@/types/chat";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localPdfName = searchParams.get('pdfName');
  console.log('localPdfName', localPdfName);

  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTyping, setCurrentTyping] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('40px');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-realtime-preview-2024-12-17');

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // useHooks
  const { loading } = useAuthCheck(setUserData, router, mounted);
  const {
    videoUrl,
    setVideoUrl,
    handleVideoChange,
    uploadedVideo,
    videoRef
  } = useVideoHandler();
  const {
    pdfUrl,
    pdfFileName,
    pdfContent,
    setPdfContent,
    handlePdfChange
  } = usePdfHandler();
  const { startRecording, stopRecording } = useAudioRecording();
  const { playAudioChunk, addTranscriptChunk, addAudioDoneMessage, cleanupAudioChunk } = useAudioStreaming(
    async () => {
      try {
        return await initializeAudioContext();
      } catch (error) {
        setError('Audio system initialization failed');
        throw error;
      }
    },
    setMessages,
    (responseId,) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'audio_playback_completed',
          responseId
        }));
      }
    }
  );

  useEffect(() => {
    setMounted(true);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (localPdfName) {
      setCurrentPdfUrl(`http://localhost:8000/uploads/${localPdfName}`);
    } else {
      setCurrentPdfUrl(pdfUrl);
    }
  }, [localPdfName, pdfUrl]);

  // Initialize WebSocket connection after authentication
  const connectWebSocket = async (selectedModel: string) => {
    try {
      const token = localStorage.getItem('token');
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      wsRef.current = new WebSocket(`${wsUrl}?token=${token}&&model=${selectedModel}`);

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

            case 'conversation_created':
              if (data.role === 'user') {
                setMessages(prev => {
                  return [
                    ...prev,
                    {
                      role: 'user',
                      content: '',
                      item_id: data.item_id,
                    }
                  ]
                });
              } else if (data.role === 'assistant') {
                setMessages(prev => {
                  return [
                    ...prev,
                    {
                      role: 'assistant',
                      content: '',
                      item_id: data.item_id,
                    }
                  ]
                });
              } else {
                console.log('Unknown message role:', data.role);
              }
              break;

            case 'audio_transcript':
              addTranscriptChunk(
                data.text,
                data.item_id,
                data.response_id
              );
              setTranscript(prev => prev + data.text);
              break;

            case 'audio_response':
              if (data.audio) {
                await playAudioChunk(
                  data.audio,
                  data.item_id,
                  data.response_id
                );
              }
              break;

            case 'audio_done':
              await addAudioDoneMessage(data.item_id, data.response_id);
              setIsAIResponding(false);
              break;

            case 'capture_screenshot':
              handleSendScreentShotMessage(data.text, data.call_id);
              break;

            case 'error':

              setError(typeof data.error === 'object' ? data.error.message : data.error);
              setIsAIResponding(false);
              break;

            case 'audio_user_message':
              setMessages(prev => {
                const index = prev.findIndex(message => message.item_id === data.item_id);
                if (index !== -1) {
                  return [
                    ...prev.slice(0, index),
                    {
                      role: 'user',
                      content: prev[index].content + data.text,
                      item_id: data.item_id
                    },
                    ...prev.slice(index + 1)
                  ];
                }
                return [
                  ...prev,
                  {
                    role: 'user',
                    content: data.text,
                    item_id: data.item_id
                  }
                ];
              });
              break;

            case 'cancel_response':
              await sendCancelNoticeToOpenAI();
              await cleanupAudioChunk();
              setIsAIResponding(false);
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

  const initializeAudioContext = useCallback(async (): Promise<AudioContext> => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          latencyHint: AUDIO_CONFIG.LATENCY_HINT
        });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    } catch (error) {
      console.error('Error initializing AudioContext:', error);
      throw error;
    }
  }, []);

  const cleanupAudioContext = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const sendCancelNoticeToOpenAI = async () => {
    const { lastItemId, playedDurationMs } = await cleanupAudioChunk();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation_cancelled',
        lastItemId: lastItemId,
        audio_end_ms: playedDurationMs
      }));
    }
  }

  const turnOnMic = async () => {
    if (!userData) return;
    try {
      const audioContext = await initializeAudioContext();
      connectWebSocket(selectedModel);

      await startRecording(audioContext, (result) => {
        if (selectedModel && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            model: selectedModel,
            audio: result.audio,
            sampleRate: result.sampleRate,
            pdfContent,
            pdfFileName
          }));
        }
      });
      setIsRecording(true);

    } catch (error) {
      console.error('Error turning on mic:', error);
      setError('Failed to turn on microphone');
    }
  };

  const turnOffMic = async () => {
    try {
      await stopRecording();
      await cleanupAudioChunk();
      await cleanupAudioContext();
      await sendCancelNoticeToOpenAI();
    } catch (error) {
      console.error('Error turning off mic:', error);
      setError('Failed to turn off microphone');
    } finally {
      closeWebsocket();
      setIsRecording(false);
      setTranscript('');
    }
  };

  const handleSendScreentShotMessage = async (query: string, call_id: string) => {
    if (!wsRef.current) return;

    let screenshot;
    if (videoUrl && videoRef.current) {
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
        isVideo: !!videoUrl
      }));
      setIsAIResponding(true);
    }
  };

  const handleSendMessage = async () => {
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
          if (videoUrl && videoRef.current) {
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
          console.error(data.message);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get response');
    } finally {
      setIsAIResponding(false);
    }
  }

  // Add websocket ref to model change handler
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  console.log('videoUrl', videoUrl, 'currentPdfUrl', currentPdfUrl);
  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={userData?.name || userData?.email || ''}
        currentPage="dashboard"
      />
      <main className="container mx-auto p-4">
        <div className="mx-auto px-2 max-w-[1920px] h-[calc(100vh-50px)]">
          <div className="flex gap-4 h-full">
            {(currentPdfUrl || videoUrl) && (
              <div className="w-[65%] bg-white shadow rounded-lg overflow-hidden">
                <MediaViewer
                  setPdfContent={setPdfContent}
                  pdfUrl={currentPdfUrl}
                  videoUrl={videoUrl || undefined}
                  uploadedVideo={uploadedVideo}
                  setVideoUrl={setVideoUrl}
                  videoRef={videoRef}
                />
              </div>
            )}

            <div className={`${(currentPdfUrl || videoUrl) ? 'w-[35%]' : 'w-full'} bg-white shadow rounded-lg flex flex-col min-w-[400px]`}>
              <ChatMessages
                messages={messages}
                transcript={transcript}
                error={error}
              />
              <div className="border-t p-4">
                <div className={`flex ${(currentPdfUrl || videoUrl) ? 'flex-col gap-3' : 'items-center gap-2'}`}>
                  <div className={`${(pdfUrl || videoUrl) ? 'flex flex-col gap-3 w-full' : 'flex items-center gap-2 w-full'}`}>
                    <div className={`shrink-0 bg-teal-50 p-1 ${(pdfUrl || videoUrl) ? 'w-full' : 'w-[100px]'}`}>
                      <MediaUploader
                        pdfUrl={pdfUrl}
                        handlePdfChange={handlePdfChange}
                        handleVideoChange={handleVideoChange}
                        videoUrl={videoUrl}
                      />
                    </div>

                    <div className="flex-grow min-w-0 bg-teal-50 p-1">
                      <ChatInput
                        textareaHeight={textareaHeight}
                        setTextareaHeight={setTextareaHeight}
                        currentTyping={currentTyping}
                        handleSendMessage={handleSendMessage}
                        setCurrentTyping={setCurrentTyping}
                        isAIResponding={isAIResponding}
                      />
                    </div>

                    <div className={`shrink-0 flex ${(pdfUrl || videoUrl) ? 'w-full' : 'w-[220px]'}`}>
                      <div className="flex w-full justify-between items-center">
                        <MicControl
                          isRecording={isRecording}
                          isAIResponding={isAIResponding}
                          turnOnMic={turnOnMic}
                          turnOffMic={turnOffMic}
                        />
                        <Select
                          value={selectedModel}
                          onValueChange={handleModelChange}
                          disabled={isRecording || isAIResponding}
                        >
                          <SelectTrigger className={`${(pdfUrl || videoUrl) ? 'w-[calc(100%-60px)]' : 'w-[140px]'}`}>
                            <SelectValue placeholder="Select Model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o-realtime-preview-2024-12-17">GPT-4o-realtime</SelectItem>
                            <SelectItem value="gpt-4o-mini-realtime-preview-2024-12-17">GPT-4o-mini-realtime</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}