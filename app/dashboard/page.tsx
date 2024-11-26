//app.dashboard/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react"; // Importing Lucide icons

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
  const [error, setError] = useState<string | null>(null);
  // State for tracking listening

  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Add this state
  const [mounted, setMounted] = useState(false);

  // Add this useEffect before other effects
  useEffect(() => {
    setMounted(true);
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

    const token = localStorage.getItem('token');
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);

    wsRef.current.onopen = () => {
      console.log('Connected to WebSocket server on port 3001');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      switch (data.type) {
        case 'text':
          setTranscript(prev => prev + '\nYou: ' + data.text);
          break;
        case 'ai_response':
          setIsAIResponding(true);
          setTranscript(prev => prev + '\nAI: ' + data.text);
          setIsAIResponding(false);
          break;
        case 'error':
          // Convert error object to string if necessary
          setError(typeof data.error === 'object' ? data.error.message : data.error);
          break;
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
    };

    return () => {
      wsRef.current?.close();
    };
  }, [userData, router]);
  // ... existing code ...
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      // First, ensure WebSocket is connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const token = localStorage.getItem('token');
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);

        // Wait for connection to open
        await new Promise((resolve, reject) => {
          wsRef.current!.onopen = resolve;
          wsRef.current!.onerror = reject;
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      console.log('Started recording'); // Debug log
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording'); // Debug log
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
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

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
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

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">How Can I help you?</h2>
            <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] mb-4">
              {transcript || "No conversation yet..."}
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => isRecording ? stopRecording() : startRecording()}
                className={`p-4 rounded-full ${isRecording ? 'bg-red-500' : 'bg-blue-500'}`}
                disabled={isAIResponding} // Optionally disable during AI response
              >
                {isRecording ? <Mic /> : <MicOff />}
              </Button>
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
      </main>
    </div>
  );
}