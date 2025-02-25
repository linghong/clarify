//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

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
import { ChatMessage } from "@/types/chat";
import Breadcrumb from '@/components/BreadCrumb';
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatListSidebar from "@/app/(internal)/dashboard/components/ChatListSidebar";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localPdfName = searchParams.get('pdfName');
  const videoName = searchParams.get('videoName');

  // Add these parameters to track navigation
  const courseId = searchParams.get('courseId');
  const courseName = searchParams.get('courseName');
  const lessonId = searchParams.get('lessonId');
  const lessonName = searchParams.get('lessonName');

  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTyping, setCurrentTyping] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('40px');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-realtime-preview-2024-12-17');

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [currentPdfId, setCurrentPdfId] = useState<string>("");
  const [currentVideoId, setCurrentVideoId] = useState<string>("");

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Chat ID maintained in state
  const [activeChatId, setActiveChatId] = useState<string>("");

  // useHooks
  const { loading, isAuthenticated } = useAuthCheck(router, mounted);
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

  // Add effect to handle video name from URL
  useEffect(() => {
    if (videoName) {
      // Use the local-ai-server URL
      const videoUrl = `http://localhost:8000/uploads/${videoName}`;
      setVideoUrl(videoUrl);
    }
  }, [videoName, setVideoUrl]);

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

  const createChat = async () => {
    if (!selectedCourseId || !selectedLessonId) {
      console.log('course or lesson not selected, message cannot be saved');
      return;
    }

    const resourceType = currentVideoId ? 'video' : currentPdfId ? 'pdf' : 'lesson';

    try {
      let resourceId;
      if (currentPdfId) {
        resourceId = currentPdfId;
      } else if (currentVideoId) {
        resourceId = currentVideoId;
      } else {
        resourceId = selectedLessonId;
      }

      const response = await fetch(
        `/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Chat ${new Date().toLocaleString()}`,
            resourceType,
            resourceId
          }),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save chat');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const setMessagesAndSaveToDB = async (messageText: string, role: string) => {
    // Update UI state
    setMessages(prev => [
      ...prev,
      { role: role as 'user' | 'assistant', content: messageText }
    ]);

    try {
      const userMessageResponse = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageText,
          role
        })
      });

      if (!userMessageResponse.ok) throw new Error('Failed to save user message');

    } catch (e) {
      console.error('Error saving message:', e);
    }
  }

  const getScreenshot = async (data: { question: string }, messageText: string) => {
    const screenshot = await (videoUrl && videoRef.current ?
      captureVideoFrame(videoRef) : takeScreenshot());

    if (!screenshot) {
      setError('Failed to capture screenshot');
      return;
    }

    const screenshotResponse = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: data.question,
        base64ImageSrc: screenshot,
        messages: [...messages, { role: 'user', content: messageText }] // Include the latest message
      })
    });

    const screenshotData = await screenshotResponse.json();

    return screenshotData;
  }

  const handleSendMessage = async () => {
    if (!currentTyping.trim()) return;
    setIsAIResponding(true);

    const messageText = currentTyping;

    // Clear input and reset height
    setCurrentTyping('');
    setTextareaHeight('40px');

    if (messages.length === 0 || !activeChatId) {
      await createChat();
    }

    try {
      // Save user message
      await setMessagesAndSaveToDB(messageText, 'user')

      // Get AI response
      const aiResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          text: messageText,
          pdfContent,
          messages
        })
      });

      const data = await aiResponse.json();

      switch (data.type) {
        case 'text':
          await setMessagesAndSaveToDB(data.content, 'assistant');
          break;

        case 'request_screenshot':
          const screenshotData = await getScreenshot(data, messageText);

          if (screenshotData.type === 'text') {
            await setMessagesAndSaveToDB(screenshotData, 'assistant');
          }
          break;

        case 'error':
          setError(data.message);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to save conversation');
    } finally {
      setIsAIResponding(false);
    }
  };

  // Add websocket ref to model change handler
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  // Update getBreadcrumbItems to include course and lesson context
  const getBreadcrumbItems = () => {
    const items = [{ name: 'Dashboard', href: '/dashboard' }];

    if (courseId && courseName) {
      items.push({
        name: decodeURIComponent(courseName),
        href: `/courses/${courseId}`
      });

      if (lessonId && lessonName) {
        items.push({
          name: decodeURIComponent(lessonName),
          href: `/courses/${courseId}/lessons/${lessonId}`
        });
      }
    }

    if (localPdfName) {
      items.push({
        name: decodeURIComponent(localPdfName),
        href: `/dashboard?pdfName=${localPdfName}&courseId=${courseId}&courseName=${courseName}&lessonId=${lessonId}&lessonName=${lessonName}`
      });
    }

    if (videoName) {
      items.push({
        name: decodeURIComponent(videoName),
        href: `/dashboard?videoName=${videoName}&courseId=${courseId}&courseName=${courseName}&lessonId=${lessonId}&lessonName=${lessonName}`
      });
    }

    return items;
  };

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Don't render anything if not authenticated
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-2">
        <div className="mb-3">
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>

        <div className="mx-auto px-2 max-w-[1920px] h-[calc(100vh-40px)]">
          <div className="flex gap-2 h-full">
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Chat</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!selectedCourseId || !selectedLessonId) {
                      alert("Please select a course and lesson first");
                      return;
                    }
                    try {
                      const newChat = await createChat();
                      if (newChat?.chat?.id) {
                        setActiveChatId(newChat.chat.id);
                        setMessages([]);
                      }
                    } catch (error) {
                      console.error('Error creating chat:', error);
                    }
                  }}
                  title="Start new chat"
                >
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </div>
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
                        selectedCourseId={selectedCourseId}
                        selectedLessonId={selectedLessonId}
                        setSelectedCourseId={setSelectedCourseId}
                        setSelectedLessonId={setSelectedLessonId}
                        setCurrentPdfId={setCurrentPdfId}
                        setCurrentVideoId={setCurrentVideoId}
                        setActiveChatId={setActiveChatId}
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
      <ChatListSidebar
        selectedCourseId={selectedCourseId}
        selectedLessonId={selectedLessonId}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setMessages={setMessages}
      />
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