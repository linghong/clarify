"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Video, MessageSquare, ChevronRight } from "lucide-react";
import Link from "next/link";
import Header from "@/app/(internal)/components/Header";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { LOCAL_SERVER_URL } from "@/lib/config";
import { UserData } from "@/types/auth";

interface Course {
  id: number;
  name: string;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
}

interface Resource {
  id: string;
  name: string;
  filename: string;
  createdAt: string;
  locations: { path: string }[];
}

interface Chat {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [pdfs, setPdfs] = useState<Resource[]>([]);
  const [videos, setVideos] = useState<Resource[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [localServerAvailable, setLocalServerAvailable] = useState(false);

  const { loading } = useAuthCheck(setUserData, router, mounted);

  const fetchCourseData = useCallback(async () => {
    try {
      const response = await fetch(`/api/courses/${params.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setCourse(data.course);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [params.id]);

  const fetchLessonData = useCallback(async () => {
    try {
      const pdfsResponse = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/pdfs`,
        { credentials: 'include' }
      );

      const pdfsData = await pdfsResponse.json();
      // Filter out temporary URLs if local server is available
      const validPdfs = localServerAvailable
        ? pdfsData.pdfs.filter((pdf: Resource) => pdf.locations[0].path.startsWith(LOCAL_SERVER_URL))
        : pdfsData.pdfs;

      setPdfs(validPdfs);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
    }
  }, [params.id, params.lessonId, localServerAvailable]);

  const fetchLessonDetails = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch lesson');
      const data = await response.json();
      setLesson(data.lesson);
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  }, [params.id, params.lessonId]);

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/chats`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setChats(data.chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, [params.id, params.lessonId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      fetchCourseData();
      fetchLessonData();
      fetchLessonDetails();
      fetchChats();
    }
  }, [mounted, loading, fetchCourseData, fetchLessonData, fetchLessonDetails, fetchChats]);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${LOCAL_SERVER_URL}/healthcheck`);
        setLocalServerAvailable(response.ok);
      } catch (error) {
        console.log(error)
        setLocalServerAvailable(false);
      }
    };

    checkServer();
  }, []);

  const handlePdfClick = (pdf: Resource) => {
    if (localServerAvailable) {
      router.push(`/dashboard?pdfName=${encodeURIComponent(pdf.name)}`);
    } else {
      alert(`Your PDF file was not saved. To display the PDF file, please enable the local server and upload the file again.`);
    }
  };

  const handleDeletePdf = async (pdf: Resource) => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/pdfs/${pdf.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete PDF');
      }

      if (localServerAvailable) {
        await deletePdfFromLocalServer(pdf);
      }

      setPdfs(prev => prev.filter(p => p.id !== pdf.id));
    } catch (error) {
      console.error('Error deleting PDF:', error);
      alert('Failed to delete PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const deletePdfFromLocalServer = async (pdf: Resource) => {
    try {
      const fileName = pdf.locations[0].path.split('/').pop();
      const localDeleteResponse = await fetch('http://127.0.0.1:8000/uploads/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName })
      });

      if (!localDeleteResponse.ok) {
        const error = await localDeleteResponse.json();
        throw new Error(error.error || 'Failed to delete file from storage');
      }
    } catch (error) {
      console.error('Error deleting PDF from local server:', error);
      throw error;
    }
  };

  const handleDeleteVideo = async (video: Resource) => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/videos/${video.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete video');
      }

      setVideos(prev => prev.filter(v => v.id !== video.id));
    } catch (error) {
      console.error('Error deleting video:', error instanceof Error ? error.message : 'Unknown error');
      alert(error || 'Failed to delete video');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        userName={userData?.name || userData?.email || ''}
        currentPage="courses"
      />

      <main className="container mx-auto py-6 px-4">
        <nav className="flex mb-6 items-center text-sm text-gray-500">
          <Link
            href="/courses"
            className="hover:text-gray-700"
          >
            Courses
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link
            href={`/courses/${params.id}`}
            className="hover:text-gray-700"
          >
            {course?.name || 'Current Course'}
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-gray-900 font-medium">
            {lesson?.title || 'Current Lesson'}
          </span>
        </nav>

        <div className={`p-2 rounded-md mb-4 ${localServerAvailable
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
          }`}>
          {localServerAvailable ? (
            '✓ Connected to local storage'
          ) : (
            <span>
              ⚠ Local server not running -
              <a href="http://github.com/linghong/local-ai-server" className="ml-2 text-blue-600 hover:underline">
                Download and install Local Server
              </a>
            </span>
          )}
        </div>

        <div className="mb-2">
          <p className="text-gray-600 text-xl font-bold">{lesson?.title}</p>
          <p className="text-gray-600">{lesson?.description}</p>
        </div>

        <Tabs defaultValue="pdfs">
          <TabsList>
            <TabsTrigger value="pdfs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDFs ({pdfs.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats ({chats.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pdfs.map(pdf => (
                <Card
                  key={pdf.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePdfClick(pdf)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base truncate">{pdf.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {new Date(pdf.createdAt).toLocaleDateString()}
                      </p>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePdf(pdf);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {pdfs.length === 0 && (
              <p className="text-center text-gray-500 py-8">No PDFs available for this lesson</p>
            )}
          </TabsContent>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <Card key={video.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{video.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Added {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                    <Button
                      variant="link"
                      className="p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteVideo(video)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {videos.length === 0 && (
              <p className="text-center text-gray-500 py-8">No videos available for this lesson</p>
            )}
          </TabsContent>

          <TabsContent value="chats">
            <div className="space-y-4">
              {chats.map(chat => (
                <Card key={chat.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded ${chat.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                        {chat.message}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(chat.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {chats.length === 0 && (
              <p className="text-center text-gray-500 py-8">No chat history for this lesson</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}