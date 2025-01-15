//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { base64ToFloat32Audio, AUDIO_CONFIG } from '@/lib/audioutils';
import { useAudioProcessing } from "@/app/(internal)/dashboard/hooks/useAudioProcessing";
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { captureVideoFrame } from "@/tools/frontend/captureVideoFrame";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const [mounted, setMounted] = useState(false);
  const [currentTyping, setCurrentTyping] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('40px');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-realtime-preview-2024-12-17');

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // for mic to audio file
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // for audio file to mic
  const audioQueueRef = useRef<{ buffer: AudioBuffer }[]>([]);
  const isPlayingRef = useRef(false);
  const totalSamplesRef = useRef(0);

  // useHooks
  const { loading } = useAuthCheck(setUserData, router, mounted);
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
  const {
    pdfUrl,
    pdfFileName,
    pdfContent,
    setPdfContent,
    handlePdfChange,
  } = usePdfHandler();

  useEffect(() => {
    setMounted(true);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

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
            case 'conversation_created':
              console.log('conversation_created', data)
              break;

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
              console.log('audio_transcript1:', data.text, 'audio_transcript2:', transcript)
              // Handle streaming transcript
              setTranscript(prev => prev + data.text);
              break;

            case 'transcript_done':
              console.log('transcript_done', transcript)
              // Handle complete transcript
              setMessages(prev => [
                ...prev,
                { role: 'assistant', content: data.text }
              ]);
              setTimeout(() => {
                setTranscript('');
              }, 100);

              break;

            case 'audio_response':
              if (data.audio) {
                await playAudioChunk(data.audio);
              }
              break;

            case 'audio_done':
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
              console.log('audio_user_message', data.text)
              setMessages(prev => [
                ...prev,
                {
                  role: 'user',
                  content: data.text
                }
              ]);
              break;

            case 'cancel_response':
              console.log('Cancelling response');
              await cleanupAudioPlayback();
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

  const TurnOnMic = async () => {
    if (!userData) return;
    try {
      connectWebSocket(selectedModel);

      await recordAndProcessAudio();
    } catch (error) {
      console.error('Error turning on mic:', error);
      setError('Failed to turn on microphone');
    }
  };

  const TurnOffMic = async () => {
    await cleanupAudioRecording();
    await cleanupAudioPlayback();

    closeWebsocket();
  };

  const initializeAudioContext = async () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          latencyHint: AUDIO_CONFIG.LATENCY_HINT
        });
        await audioContextRef.current.resume();
        console.log('New AudioContext created:', audioContextRef.current.state);
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed:', audioContextRef.current.state);
      }
    } catch (error) {
      console.error('Error initializing AudioContext:', error);
      throw error;
    }
  };

  const recordAndProcessAudio = async () => {
    // Setup audio context and worklet
    await initializeAudioContext();
    if (!audioContextRef.current) {
      throw new Error('AudioContext initialization failed');
    }

    await audioContextRef.current.audioWorklet.addModule(AUDIO_CONFIG.AUDIO_WORKLET_PATH);
    const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONFIG.AUDIO_CONSTRAINTS
    });
    streamRef.current = stream;
    const source = audioContextRef.current.createMediaStreamSource(stream);

    // Process and send audio to OpenAI
    workletNode.port.onmessage = async (event) => {
      if (event.data.eventType === 'audio') {
        await processAudioData(event.data.audioData);
        await onAudioProcessed((result) => {
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
      }
    };
    source.connect(workletNode);

    setIsRecording(true);
  };

  const cleanupAudioRecording = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setTranscript('');
  };

  const playAudioChunk = async (base64Audio: string) => {
    try {
      await initializeAudioContext();

      if (!audioContextRef.current) {
        throw new Error('AudioContext initialization failed');
      }

      const samples = base64ToFloat32Audio(base64Audio);

      const audioBuffer = audioContextRef.current.createBuffer(1, samples.length, AUDIO_CONFIG.SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(samples);

      audioQueueRef.current.push({ buffer: audioBuffer });
      totalSamplesRef.current += samples.length;

      // Start playing if not already playing
      if (!isPlayingRef.current && totalSamplesRef.current >= AUDIO_CONFIG.PLAYBACK_BUFFER_SIZE) {
        await playNextInQueue();
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      // Reset on error
      await cleanupAudioPlayback();
    }
  };

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPlayingRef.current) {
      return;
    }

    try {
      isPlayingRef.current = true;
      const nextAudio = audioQueueRef.current[0];

      const source = audioContextRef.current.createBufferSource();
      source.buffer = nextAudio.buffer;
      source.playbackRate.value = 1.1;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        audioQueueRef.current.shift();
        totalSamplesRef.current -= nextAudio.buffer.length;
        isPlayingRef.current = false;
        // Play next chunk if available
        if (audioQueueRef.current.length > 0) {
          playNextInQueue();
        }
      };

      source.start(0);
    } catch (error) {
      console.error('Error in playNextInQueue:', error);
      isPlayingRef.current = false;
      audioQueueRef.current = [];
    }
  };

  // Add this function at component level
  const cleanupAudioPlayback = async () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setTranscript('');
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

            <div className={`${(pdfUrl || showVideo) ? 'w-[35%]' : 'w-full'} bg-white shadow rounded-lg flex flex-col min-w-[400px]`}>
              <ChatMessages
                messages={messages}
                transcript={transcript}
                error={error}
              />
              <div className="border-t p-4">
                <div className={`flex ${(pdfUrl || showVideo) ? 'flex-col gap-3' : 'items-center gap-2'}`}>
                  <div className={`${(pdfUrl || showVideo) ? 'flex flex-col gap-3 w-full' : 'flex items-center gap-2 w-full'}`}>
                    <div className={`shrink-0 bg-teal-50 p-1 ${(pdfUrl || showVideo) ? 'w-full' : 'w-[100px]'}`}>
                      <MediaUploader
                        showVideo={showVideo}
                        pdfUrl={pdfUrl}
                        handlePdfChange={handlePdfChange}
                        handleVideoUpload={handleVideoUpload}
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

                    <div className={`shrink-0 flex ${(pdfUrl || showVideo) ? 'w-full' : 'w-[220px]'}`}>
                      <div className="flex w-full justify-between items-center">
                        <MicControl
                          isRecording={isRecording}
                          isAIResponding={isAIResponding}
                          startRecording={TurnOnMic}
                          stopRecording={TurnOffMic}
                        />
                        <Select
                          value={selectedModel}
                          onValueChange={handleModelChange}
                          disabled={isRecording || isAIResponding}
                        >
                          <SelectTrigger className={`${(pdfUrl || showVideo) ? 'w-[calc(100%-60px)]' : 'w-[140px]'}`}>
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