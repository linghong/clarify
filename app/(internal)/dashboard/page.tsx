//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import BreadcrumbNavigation from '@/app/(internal)/components/BreadcrumbNavigation';
import ChatHeader from "@/app/(internal)/dashboard/components/ChatHeader";
import ChatInput from "@/app/(internal)/dashboard/components/ChatInput";
import ChatMessages from "@/app/(internal)/dashboard/components/ChatMessages";
import MediaViewer from "@/app/(internal)/dashboard/components/MediaViewer";
import MicControl from "@/app/(internal)/dashboard/components/MicControl";
import VideoNotes from './components/VideoNotes';
import NoteEditor from './components/NoteEditor';

import { useAudioRecording } from "@/app/(internal)/dashboard/hooks/useAudioRecording";
import { useAudioStreaming } from "@/app/(internal)/dashboard/hooks/useAudioStreaming";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { usePdfHandler } from "@/app/(internal)/dashboard/hooks/usePdfHandler";
import { useVideoHandler } from "@/app/(internal)/dashboard/hooks/useVideoHandler";

import { createChatUtil, updateChatTitle } from "@/app/(internal)/dashboard/utils/chatUtils";
import { saveMessagesBatchToDB } from "@/app/(internal)/dashboard/utils/saveMessagesBatchToDB";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AUDIO_CONFIG } from '@/lib/audioutils';
import { captureVideoFrame } from "@/tools/frontend/captureVideoFrame";
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { ChatMessage } from "@/types/chat";
import { handleSendTextMessage } from "@/app/(internal)/dashboard/utils/messagingUtils";
import SidebarContainer from './components/SidebarContainer';
import { useToast } from "@/components/common/Toast";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pdfName = searchParams.get('pdfName');
  const pdfId = searchParams.get('pdfId');
  const videoName = searchParams.get('videoName');
  const videoId = searchParams.get('videoId');
  const courseId = searchParams.get('courseId');
  const courseName = searchParams.get('courseName');
  const lessonId = searchParams.get('lessonId');
  const lessonName = searchParams.get('lessonName');

  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTyping, setCurrentTyping] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('40px');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-realtime-preview-2024-12-17');

  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentPdfId, setCurrentPdfId] = useState<string>("");
  const [currentVideoId, setCurrentVideoId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");
  const [selectedLessonName, setSelectedLessonName] = useState<string>("");
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [activeChatTitle, setActiveChatTitle] = useState<string>("");
  const [messageStart, setMessageStart] = useState<number>(0);

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Add new state variables for note functionality
  const [contentSource, setContentSource] = useState<'text-chat' | 'voice-chat' | 'note'>('text-chat');
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState('');
  const [activeNoteTitle, setActiveNoteTitle] = useState('');

  const { addToast } = useToast();
  // useHooks
  const { loading, isAuthenticated } = useAuthCheck(router, mounted);

  const {
    videoFileUrl,
    videoFileName,
    handleVideoChange,
    uploadedVideo,
    videoRef
  } = useVideoHandler();

  const {
    pdfFileUrl,
    pdfFileName,
    handlePdfChange,
    pdfContent,
    setPdfContent,
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
    if (pdfId) {
      setCurrentPdfId(pdfId);
    }

    if (pdfName) {
      if (courseId && lessonId) {
        setCurrentPdfUrl(`http://localhost:8000/uploads/course_${courseId}/lesson_${lessonId}/${pdfName}`);
        setSelectedCourseId(courseId);
        setSelectedLessonId(lessonId);
      } else {
        setCurrentPdfUrl(`http://localhost:8000/uploads/${pdfName}`);
      }
    } else {
      setCurrentPdfUrl(pdfFileUrl);
    }
  }, [pdfName, pdfId, pdfFileUrl, courseId, lessonId]);

  useEffect(() => {
    if (videoId) {
      setCurrentVideoId(videoId);
    }
    if (courseId && lessonId) {
      setSelectedCourseId(courseId);
      setSelectedLessonId(lessonId);
    }
    if (videoName) {
      const videoUrl = courseId && lessonId ? `http://localhost:8000/uploads/course_${courseId}/lesson_${lessonId}/${videoName}` : `http://localhost:8000/uploads/${videoName}`;

      setCurrentVideoUrl(videoUrl);
    } else {
      setCurrentVideoUrl(videoFileUrl);
    }
  }, [videoId, videoName, videoFileUrl, courseId, lessonId]);

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

      wsRef.current.onmessage = async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'text':
              setMessages((prev: ChatMessage[]) => {
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
                setMessages((prev: ChatMessage[]) => {
                  return [
                    ...prev,
                    {
                      role: 'user',
                      content: '',
                      item_id: data.item_id,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  ]
                });
              } else if (data.role === 'assistant') {
                setMessages((prev: ChatMessage[]) => {
                  return [
                    ...prev,
                    {
                      role: 'assistant',
                      content: '',
                      item_id: data.item_id,
                      createdAt: new Date(),
                      updatedAt: new Date()
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
              setTranscript((prev: string) => prev + data.text);
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

            case 'audio_user_message':
              setMessages((prev: ChatMessage[]) => {
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

            case 'error':
              setError(typeof data.error === 'object' ? data.error.message : data.error);
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
      switchContentMode('voice-chat');
      setMessageStart(messages.length)
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

      //remove messages that already saved
      const newMessages = messages.filter((m, i) => i >= messageStart)
      await saveMessagesBatchToDB(newMessages, activeChatId, selectedCourseId, selectedLessonId, createChat);
      setContentSource('text-chat');

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
    if (!videoRef || !videoRef.current || !currentVideoUrl) return;

    let screenshot;
    //for video urls that was temporarily genearated using URL.createObjectURL(file);
    if (currentVideoUrl && !currentVideoUrl.includes('http') && videoRef.current) {
      screenshot = await captureVideoFrame(videoRef as React.RefObject<HTMLVideoElement>);
    } else {
      //for video urls that fetched from the server
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
        isVideo: !!currentVideoUrl
      }));
      setIsAIResponding(true);
    }
  };

  const switchContentMode = (newMode: 'text-chat' | 'voice-chat' | 'note') => {

    if (newMode === 'note') {
      setActiveNoteId(null);
      setActiveNoteTitle('');
      setActiveNoteContent('');
    } else {
      setActiveChatId('');
      setActiveChatTitle('');
      setMessages([]);
      setMessageStart(0);
    }

    setContentSource(newMode);

    if (!selectedLessonId || !selectedCourseId) {
      addToast({
        title: "Error",
        description: `Cannot create ${newMode}: Missing course or lesson context. Please create a course and lesson first.`,
        variant: "destructive",
      });
    }
  };

  // Create a wrapper function that uses the utility
  const createChat = useCallback(async () => {
    return await createChatUtil({
      selectedCourseId,
      selectedLessonId,
      currentPdfId,
      currentVideoId,
      setActiveChatId,
      setActiveChatTitle,
      setMessages,
      setError,
      setMessageStart,
      contentSource
    });
  }, [
    selectedCourseId,
    selectedLessonId,
    currentPdfId,
    currentVideoId,
    setActiveChatId,
    setActiveChatTitle,
    setMessages,
    setError,
    setMessageStart,
    contentSource
  ]);

  const handleNoteSaved = async (savedNoteId: number, title: string, content: string) => {
    // Set the active note ID to the saved note ID (whether new or existing)
    setActiveNoteId(savedNoteId);
    setActiveNoteContent(content);
    setActiveNoteTitle(title);
    setContentSource('note');
  };


  const handleSendMessage = async () => {
    // Clear input and reset height
    setCurrentTyping('');
    try {
      await handleSendTextMessage({
        messageText: currentTyping,
        messages,
        pdfContent,
        activeChatId,
        selectedCourseId,
        selectedLessonId,
        setMessages,
        setError,
        setIsAIResponding,
        setActiveChatId,
        createChat,
        videoUrl: currentVideoUrl || undefined,
        videoRef: videoRef as React.RefObject<HTMLVideoElement>
      });
    } catch (error) {
      setCurrentTyping(currentTyping);
      setError(error as string);
    } finally {
      setTextareaHeight('40px');
    }
  };

  // Add websocket ref to model change handler
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  // Add this useEffect to handle URL parameters
  useEffect(() => {
    if (mounted) {
      // Preserve existing query parameters when updating state
      const params = new URLSearchParams(window.location.search);

      if (courseId) {
        params.set('courseId', courseId);
        setSelectedCourseId(courseId);
      }
      if (lessonId) {
        params.set('lessonId', lessonId);
        setSelectedLessonId(lessonId);
      }
      if (courseName) {
        params.set('courseName', courseName);
        setSelectedCourseName(courseName);
      }
      if (lessonName) {
        params.set('lessonName', lessonName);
        setSelectedLessonName(lessonName);
      }

      // Update URL without reload
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [mounted, courseId, lessonId, courseName, lessonName, router]);

  useEffect(() => {
    // Check if user is logged in and it's their first session
    const checkFirstTimeUser = async () => {
      if (isAuthenticated && mounted) {
        try {
          // First check if user has any courses
          const coursesResponse = await fetch('/api/courses', {
            credentials: 'include'
          });

          if (coursesResponse.ok) {
            const data = await coursesResponse.json();

            // If user has no courses, redirect to courses page
            if (data.courses.length === 0) {
              router.push('/courses');
            }
          }
        } catch (error) {
          console.error("Error checking user courses:", error);
        }
      }
    };

    checkFirstTimeUser();
  }, [isAuthenticated, mounted, router]);


  // Debounce the title update to prevent too many API calls
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (activeChatId && activeChatTitle && selectedCourseId && selectedLessonId) {
        updateChatTitle(activeChatTitle, selectedCourseId, selectedLessonId, activeChatId);
      }
    }, 3000); // Wait for 3 second

    return () => clearTimeout(debounceTimeout);
  }, [activeChatTitle, activeChatId, selectedCourseId, selectedLessonId]);

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
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow flex flex-col h-[calc(100vh-80px)] w-full">
        {/* Top row with breadcrumb and chat header side by side */}
        <div className="flex w-full px-4 py-2">
          {(currentPdfUrl || currentVideoUrl || (courseId && lessonId)) && (
            <div className="w-full flex items-center">
              <BreadcrumbNavigation
                courseId={courseId || selectedCourseId}
                courseName={courseName ? decodeURIComponent(courseName) : selectedCourseName}
                lessonId={lessonId || selectedLessonId}
                lessonName={lessonName ? decodeURIComponent(lessonName) : selectedLessonName}
                resourceName={
                  currentVideoUrl
                    ? videoName || videoFileName || ''
                    : currentPdfUrl
                      ? pdfName || pdfFileName || ''
                      : ''
                }
                resourceType={currentVideoUrl ? 'video' : currentPdfUrl ? 'pdf' : 'lesson'}
              />
            </div>
          )}
        </div>

        {/* Content row with media viewer and chat area */}
        <div className="flex-grow flex w-full h-full px-4">
          <div className="flex gap-2 w-full h-full">
            {/* Media viewer (left side) - only shown when media exists */}
            {(currentPdfUrl || currentVideoUrl) && (
              <div className="w-3/5 md:w-2/3 lg:w-3/5 flex flex-col h-[calc(100vh-120px)]">
                <div className="bg-white shadow rounded-lg overflow-hidden flex-grow-0">
                  <MediaViewer
                    setPdfContent={setPdfContent}
                    pdfUrl={currentPdfUrl}
                    videoUrl={currentVideoUrl || undefined}
                    uploadedVideo={uploadedVideo}
                    setVideoUrl={setCurrentVideoUrl}
                    videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                    resourceId={currentVideoUrl ? parseInt(currentVideoId) : currentPdfUrl ? parseInt(currentPdfId) : 0}
                    lessonId={selectedLessonId ? parseInt(selectedLessonId) : 0}
                  />
                </div>

                {currentVideoId && (
                  <VideoNotes
                    videoId={currentVideoId}
                    videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                  />
                )}
              </div>
            )}

            {/* Chat panel (right side) */}
            <div className={`${(currentPdfUrl || currentVideoUrl) ? 'w-2/5 md:w-1/3 lg:w-2/5' : 'w-full'} flex flex-col`}>
              <div className="bg-white shadow rounded-lg flex flex-col flex-grow relative">
                {/* Always show sticky header */}
                <div className="sticky top-0 z-10 bg-white">
                  <ChatHeader
                    switchContentMode={switchContentMode}
                    contentSource={contentSource}
                    pdfUrl={pdfFileUrl}
                    handlePdfChange={handlePdfChange}
                    handleVideoChange={handleVideoChange}
                    videoUrl={videoFileUrl}
                    selectedCourseId={selectedCourseId}
                    selectedLessonId={selectedLessonId}
                    setSelectedCourseId={setSelectedCourseId}
                    setSelectedLessonId={setSelectedLessonId}
                    setSelectedCourseName={setSelectedCourseName}
                    setSelectedLessonName={setSelectedLessonName}
                    setCurrentPdfId={setCurrentPdfId}
                    setCurrentVideoId={setCurrentVideoId}
                    setActiveChatId={setActiveChatId}
                  />
                </div>

                {/* Conditional rendering based on mode */}
                {contentSource === 'note' ? (
                  <NoteEditor
                    resourceType={currentVideoUrl ? 'video' : currentPdfUrl ? 'pdf' : 'lesson'}
                    resourceId={
                      currentVideoUrl ? parseInt(currentVideoId) || 0 :
                        currentPdfUrl ? parseInt(currentPdfId) || 0 :
                          parseInt(selectedLessonId) || 0
                    }
                    lessonId={parseInt(selectedLessonId) || 0}
                    courseId={parseInt(selectedCourseId) || 0}
                    initialNote={activeNoteContent}
                    initialTitle={activeNoteTitle}
                    noteId={activeNoteId || undefined}
                    onSave={handleNoteSaved}
                    onCancel={() => setContentSource('text-chat')}
                  />
                ) : (
                  <>
                    <div className="flex-grow overflow-y-auto p-3">
                      <ChatMessages
                        resourceType={currentVideoUrl ? 'video' : currentPdfUrl ? 'pdf' : 'lesson'}
                        resourceId={
                          currentVideoUrl ? parseInt(currentVideoId) || 0 :
                            currentPdfUrl ? parseInt(currentPdfId) || 0 :
                              parseInt(selectedLessonId) || 0
                        }
                        messages={messages}
                        transcript={transcript}
                        error={error}
                        courseId={selectedCourseId}
                        lessonId={selectedLessonId}
                        chatTitle={activeChatTitle}
                        setChatTitle={setActiveChatTitle}
                        contentSource={contentSource}
                      />
                    </div>

                    {/* Chat controls */}
                    <div className="border-t p-2 sticky bottom-0 bg-white z-10">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 w-full">
                          <div className="shrink-0 bg-teal-50 p-1 rounded w-full">
                            <div className="flex-grow min-w-0 bg-teal-50 p-1 rounded">
                              <ChatInput
                                textareaHeight={textareaHeight}
                                setTextareaHeight={setTextareaHeight}
                                currentTyping={currentTyping}
                                handleSendMessage={handleSendMessage}
                                setCurrentTyping={setCurrentTyping}
                                isAIResponding={isAIResponding}
                              />
                            </div>
                            <div className="shrink-0 flex w-full">
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
                                  <SelectTrigger className="w-[calc(100%-60px)]">
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <SidebarContainer
        selectedCourseId={selectedCourseId}
        selectedLessonId={selectedLessonId}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setActiveChatTitle={setActiveChatTitle}
        setMessages={setMessages}
        setMessageStart={setMessageStart}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        setActiveNoteContent={setActiveNoteContent}
        contentSource={contentSource}
        currentPdfId={currentPdfId}
        currentVideoId={currentVideoId}
        setActiveNoteTitle={setActiveNoteTitle}
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