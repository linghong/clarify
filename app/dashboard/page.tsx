//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Upload } from "lucide-react";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import { Button } from "@/components/ui/button";
import PdfUploader from "@/components/PdfUploader";
import PdfViewer from "@/components/PdfViewer";
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { useAudioProcessing } from "@/hooks/useAudioProcessing";
import { AUDIO_CONFIG } from "@/types/audio";
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
          console.log('Connected to Clarify WebSocket server');
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
                // Handle streaming text from AI
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
          console.log('Connected to WebSocket server');
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

  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
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
      const minBufferTime = isEndOfSentence ? 0.08 : 0.04; // Reduced buffer times
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
    source.playbackRate.value = 1.15;

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

      wsRef.current?.send(JSON.stringify({
        type: 'visual_query',
        query: query,
        chatHistory: transcript,
        pdfContent: pdfContent,
        base64ImageSrc: screenshotBase64,
        call_id: call_id
      }));

      setIsAIResponding(true);
    }
  };

  const handleSendMessage = () => {
    if (!currentTyping.trim() || !wsRef.current) return;

    if (wsRef.current.readyState === WebSocket.OPEN) {
      // Add user message to the messages state
      setMessages(prev => [...prev, { role: 'user', content: currentTyping }]);

      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: currentTyping,
        pdfContent: pdfContent
      }));

      setCurrentTyping('');
      setIsAIResponding(true);
    }
  };

  const handleSendPdfContent = () => {
    if (!pdfContent?.trim() || !wsRef.current) return;
    // Send both the user message and PDF content if available
    if (wsRef.current.readyState === WebSocket.OPEN) {
      console.log("pdf content sent to AI")
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: pdfContent // Include PDF content if available
      }));
      setPdfContent('');
      setIsAIResponding(true);
    }
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
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 justify-between items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {userData?.name || userData?.email}
              </span>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="ml-4"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 py-2">
        <div className="mx-auto px-4 max-w-7xl h-[calc(100vh-20px)]">
          <div className="flex gap-6 h-full">
            {pdfUrl && (
              <div className="w-1/2 bg-white shadow rounded-lg overflow-hidden">
                <PdfViewer
                  pdfUrl={pdfUrl}
                  className="h-full"
                  onTextExtracted={(text) => {
                    setPdfContent(text);
                  }}
                />
              </div>
            )}

            <div className={`${pdfUrl ? 'w-1/2' : 'w-full'} bg-white shadow rounded-lg flex flex-col`}>
              {/* Chat messages - scrollable area */}
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 && !transcript ? (
                  <div className="text-gray-500 text-center">
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
                          className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                            ? 'bg-teal-50 text-black'
                            : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}

                    {/* Show transcript while AI is responding */}
                    {transcript && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
                          <span className="animate-pulse">{transcript}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isAIResponding && !transcript && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                      <div className="animate-pulse">AI is responding...</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed bottom area for input and controls */}
              <div className="border-t p-4">
                <div className="flex space-x-4 items-center">
                  <PdfUploader
                    onPdfChange={setPdfUrl}
                    hasActivePdf={!!pdfUrl}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Upload className="h-4 w-4" />
                  </PdfUploader>

                  <input
                    type="text"
                    value={currentTyping}
                    onChange={(e) => setCurrentTyping(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isAIResponding}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isAIResponding || !currentTyping.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    Send
                  </Button>
                  <Button
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    className={`p-4 rounded-lg ${isRecording ? 'bg-red-500' : 'bg-emerald-600 hover:bg-emerald-700'
                      } text-white disabled:opacity-50`}
                    disabled={isAIResponding}
                  >
                    {isRecording ? <Mic /> : <MicOff />}
                  </Button>
                </div>
              </div>
              {isAIResponding && (
                <div className="mt-2 text-blue-500 text-center">
                  AI is responding...
                </div>
              )}
              {error && (
                <div className="mt-4 text-red-500 text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}