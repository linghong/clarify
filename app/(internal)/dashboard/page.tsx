//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Upload, Video } from "lucide-react";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import ReactMarkdown from 'react-markdown';

import { Button } from "@/components/ui/button";
import PdfUploader from "@/components/PdfUploader";
import PdfViewer from "@/components/PdfViewer";
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { useAudioProcessing } from "@/hooks/useAudioProcessing";
import { AUDIO_CONFIG } from "@/types/audio";
import Header from "@/app/(internal)/components/Header";

interface UserData {
  id: number;
  email: string;
  name: string | null;
}

export default function DashboardPage() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTyping, setCurrentTyping] = useState('');
  const [mounted, setMounted] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showVideo, setShowVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<{
    title: string;
    author: string;
    subscribers?: string;
  }>({ title: '', author: '', subscribers: '' });

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<{ buffer: AudioBuffer; timestamp: number }[]>([]);
  const isPlayingRef = useRef(false);

  const { processAudioData } = useAudioProcessing(wsRef);

  // Add this useEffect before other effects
  useEffect(() => {
    setMounted(true);
    return () => {
      audioQueueRef.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Authentication Check
  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Authentication failed");
        }

        const data = await response.json();
        setUserData(data.user);
      } catch (error) {
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, mounted]);

  // Initialize WebSocket connection after authentication
  useEffect(() => {
    if (!userData) return;

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
                const screenshotBase64 = await takeScreenshot();

                if (screenshotBase64) handleSendScreentShotMessage(data.text, screenshotBase64, data.call_id)
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

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userData, router]);

  const startRecording = async () => {
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
      workletNode.port.onmessage = (event) => {
        if (event.data.eventType === 'audio') {
          processAudioData(event.data.audioData);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      workletNodeRef.current = workletNode;

      // Initialize WebSocket if not already connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const token = localStorage.getItem('token');
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);

        wsRef.current.onopen = () => {
          setIsRecording(true);
          setError(null);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error');
          stopRecording();
        };
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
      const minBufferTime = isEndOfSentence ? 0.9 : 0.04; // Reduced buffer times
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
    source.playbackRate.value = 1;

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

  const handleSendScreentShotMessage = (query: string, screenshotBase64: string, call_id: string) => {
    if (!wsRef.current) return;

    if (wsRef.current.readyState === WebSocket.OPEN) {
      if (call_id === 'request_visual_content') {
        wsRef.current?.send(JSON.stringify({
          type: 'text',
          text: query,
          pdfContent: pdfContent,
          messages: messages,
          base64ImageSrc: screenshotBase64,
          call_id: call_id
        }));
        setIsAIResponding(true);
      } else {
        wsRef.current?.send(JSON.stringify({
          type: 'visual_query',
          query: query,
          chatHistory: transcript,
          pdfContent: pdfContent,
          base64ImageSrc: screenshotBase64,
          call_id: call_id
        }));
      }
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
          const screenshot = await takeScreenshot();
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

  const handleSendPdfContent = () => {
    if (!pdfContent?.trim() || !wsRef.current) return;
    // Send both the user message and PDF content if available
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: pdfContent // Include PDF content if available
      }));
      setPdfContent('');
      setIsAIResponding(true);
    }
  };

  // Add function to extract video ID from various video platform URLs
  const getVideoEmbedUrl = (url: string): string | null => {
    try {
      // YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtube.com')
          ? url.split('v=')[1].split('&')[0]
          : url.split('youtu.be/')[1];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      // Vimeo
      if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1];
        return `https://player.vimeo.com/video/${videoId}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Add this function to fetch video title
  const getVideoMetadata = async (url: string) => {
    try {
      const response = await fetch(`/api/video-info?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch video metadata');
      }

      const data = await response.json();
      return {
        title: data.title || 'Untitled Video',
        author: data.author || 'Unknown',
        subscribers: data.subscribers
      };
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      return { title: 'Untitled Video', author: 'Unknown' };
    }
  };

  // Update handleVideoClick to be async and fetch title
  const handleVideoClick = async () => {
    const embedUrl = getVideoEmbedUrl(currentTyping);
    if (embedUrl) {
      setVideoUrl(embedUrl);
      setShowVideo(true);
      const metadata = await getVideoMetadata(currentTyping);
      setVideoMetadata(metadata);
      setCurrentTyping('');
    } else {
      setError('Please enter a valid YouTube or Vimeo URL');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Add this state for textarea height
  const [textareaHeight, setTextareaHeight] = useState('40px');

  // Add this function to handle textarea resize
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTyping(e.target.value);
    // Reset height to auto to get the right scrollHeight
    e.target.style.height = 'auto';
    // Set new height based on scrollHeight (with max-height limit)
    const newHeight = Math.min(e.target.scrollHeight, 200) + 'px';
    setTextareaHeight(newHeight);
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
        <div className="mx-auto px-2 max-w-[1920px] h-[calc(100vh-40px)]">
          <div className="flex gap-4 h-full">
            {/* Left column - Video/PDF viewer (2/3 width) */}
            {(pdfUrl || showVideo) && (
              <div className="w-[65%] bg-white shadow rounded-lg overflow-hidden">
                {showVideo ? (
                  <div className="flex flex-col h-full">
                    <div className="relative w-full h-0 pb-[56.25%] bg-black">
                      <iframe
                        src={videoUrl}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <Button
                        onClick={() => {
                          setShowVideo(false);
                          setVideoUrl('');
                          setVideoTitle('');
                        }}
                        className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white"
                      >
                        Close Video
                      </Button>
                    </div>
                    {videoMetadata.title && (
                      <div className="p-4 border-t bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {videoMetadata.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {videoMetadata.author}
                          {videoMetadata.subscribers && ` • ${videoMetadata.subscribers} subscribers`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full">
                    {pdfUrl && (
                      <PdfViewer
                        pdfUrl={pdfUrl}
                        className="h-full w-full"
                        onTextExtracted={(text) => {
                          setPdfContent(text);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Right column - Chat (1/3 width or full if no video/pdf) */}
            <div
              className={`${(pdfUrl || showVideo) ? 'w-[35%]' : 'w-full'
                } bg-white shadow rounded-lg flex flex-col min-w-[300px]`}
            >
              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !transcript ? (
                  <div className="text-gray-500 text-center py-4">
                    Start a conversation...
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-lg p-3 ${message.role === 'user'
                            ? 'bg-teal-50 text-black'
                            : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          {message.role === 'user' ? (
                            message.content
                          ) : (
                            <ReactMarkdown
                              className="prose prose-sm max-w-none"
                              components={{
                                p: ({ children }) => <p className="mb-2">{children}</p>,
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                code: ({ children }) => <code className="bg-gray-200 px-1 rounded">{children}</code>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    ))}
                    {transcript && (
                      <div className="flex justify-start">
                        <div className="max-w-[90%] rounded-lg p-3 bg-gray-100 text-gray-900">
                          <span className="animate-pulse">{transcript}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Input area */}
              <div className="border-t p-2">
                <div className="flex items-center space-x-2">
                  <PdfUploader
                    onPdfChange={setPdfUrl}
                    hasActivePdf={!!pdfUrl}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Upload className="h-4 w-4" />
                  </PdfUploader>

                  <textarea
                    value={currentTyping}
                    onChange={handleTextareaResize}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isAIResponding}
                    placeholder="Type your message or paste video URL and click video icon..."
                    className="flex-1 min-w-0 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                    style={{
                      height: textareaHeight,
                      minHeight: '40px',
                      maxHeight: '200px'
                    }}
                  />

                  <Button
                    onClick={handleVideoClick}
                    disabled={isAIResponding || !currentTyping.includes('youtube.com') && !currentTyping.includes('youtu.be') && !currentTyping.includes('vimeo.com')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Video className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={handleSendMessage}
                    disabled={isAIResponding || !currentTyping.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    Send
                  </Button>

                  <Button
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    className={`${isRecording ? 'bg-red-500' : 'bg-emerald-600 hover:bg-emerald-700'
                      } text-white shrink-0`}
                    disabled={isAIResponding}
                  >
                    {isRecording ? <Mic /> : <MicOff />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}