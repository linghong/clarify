"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Video, Trash } from "lucide-react";
import { LOCAL_SERVER_URL } from "@/lib/config";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { useToast } from "@/components/Toast";
import BreadcrumbNavigation from '@/app/(internal)/components/BreadcrumbNavigation';

import { Course, Lesson, PdfResource, VideoResource } from "@/types/course";
import { Chat } from "@/types/course";
import { deleteFileFromLocalServer } from "@/lib/fileUtils";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [pdfs, setPdfs] = useState<PdfResource[]>([]);
  const [videos, setVideos] = useState<VideoResource[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [mounted, setMounted] = useState(false);
  const [localServerAvailable, setLocalServerAvailable] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const { addToast } = useToast();

  const { loading } = useAuthCheck(router, mounted);

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

  const fetchPdfData = useCallback(async () => {
    try {
      const pdfsResponse = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/pdfs`,
        { credentials: 'include' }
      );

      const pdfsData = await pdfsResponse.json();

      const validPdfs = localServerAvailable
        ? pdfsData.pdfs.filter((pdf: PdfResource) => pdf.url?.startsWith(LOCAL_SERVER_URL))
        : pdfsData.pdfs;

      setPdfs(validPdfs);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
    }
  }, [params.id, params.lessonId, localServerAvailable]);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/videos`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      setVideos(data.videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  }, [params.id, params.lessonId]);

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/chats`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      setChats(data.chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]);
    }
  }, [params.id, params.lessonId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      fetchCourseData();
      fetchPdfData();
      fetchLessonData();
      fetchVideos();
      fetchChats();
    }
  }, [mounted, loading, fetchCourseData, fetchPdfData, fetchLessonData, fetchVideos, fetchChats]);

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

  const handlePdfClick = (pdf: PdfResource) => {
    if (localServerAvailable && pdf.url) {
      router.push(`/dashboard?pdfName=${encodeURIComponent(pdf.name)}&pdfId=${encodeURIComponent(pdf.id)}&courseId=${params.id}&courseName=${encodeURIComponent(course?.name || '')}&lessonId=${params.lessonId}&lessonName=${encodeURIComponent(lesson?.title || '')}`);
    } else {
      alert(localServerAvailable ? 'PDF URL missing' : 'Local server not available');
    }
  };
  const handleVideoClick = (video: VideoResource) => {

    const videoPath = video.url.split('/');
    const videoName = videoPath[videoPath.length - 1];
    router.push(`/dashboard?videoName=${encodeURIComponent(videoName)}&videoId=${encodeURIComponent(video.id)}&courseId=${params.id}&courseName=${encodeURIComponent(course?.name || '')}&lessonId=${params.lessonId}&lessonName=${encodeURIComponent(lesson?.title || '')}`);
  }

  const deletionWarning = (type: 'pdf' | 'video') => {
    return `The ${type} metadata was successfully removed from database, but the file couldn't be deleted from your local storage as the local server is unavailable. Please delete it manually.`
  }

  const deletionSuccess = (type: 'pdf' | 'video') => {
    return `The ${type} has been removed from this lesson.`
  }

  const handleDeletePdf = async (pdf: PdfResource) => {
    try {
      // Step 1: Delete database record
      const response = await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}/pdfs/${pdf.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete PDF');
      }

      const result = await response.json();

      if (result.success) {
        setPdfs(prev => prev.filter(p => p.id !== pdf.id));
      }

      // Step 2: Delete file from local storage
      if (localServerAvailable) {
        try {
          const deleteResult = await deleteFileFromLocalServer(pdf.url);

          if (!deleteResult || !deleteResult.success) {
            console.warn('Could not delete the PDF file:', deleteResult?.error || 'Unknown error');
            addToast({
              title: "Warning",
              description: deletionWarning('pdf'),
              variant: "default",
            });
            return;
          }

          addToast({
            title: "PDF deleted",
            description: "The PDF has been removed from this lesson.",
          });

        } catch (fileError) {
          console.warn('Could not delete the PDF file:', fileError);
          addToast({
            title: "Warning",
            description: "The PDF metadata was successfully removed from database, but the file couldn't be deleted from your local storage. Please delete it manually.",
            variant: "default",
          });
        }
      } else {
        addToast({
          title: "PDF deleted",
          description: "The PDF  metadata was successfully from this lesson, but the file couldn't be deleted from your local storage as the local server is unavailable. Please delete it manually.",
        });
      }

    } catch (error) {
      console.error('Error deleting PDF:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete PDF",
        variant: "destructive"
      });
    }
  };

  const handleDeleteVideo = async (video: VideoResource) => {
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

      if (result.success) {
        setVideos(prev => prev.filter(v => v.id !== video.id));
      }

      if (localServerAvailable) {
        try {
          const deleteResult = await deleteFileFromLocalServer(video.url);

          if (!deleteResult || !deleteResult.success) {
            console.warn('Could not delete the video file:', deleteResult?.error || 'Unknown error');
            addToast({
              title: "Warning",
              description: "The video was removed from your lesson, but the file couldn't be deleted from storage.",
              variant: "default",
            });
            return;
          }

          addToast({
            title: "Video deleted",
            description: "The Video has been removed from this lesson.",
          });
        } catch (fileError) {
          console.warn('Could not delete the video file:', fileError);
          addToast({
            title: "Warning",
            description: "The video was removed from your lesson, but the file couldn't be deleted from storage.",
            variant: "default",
          });
        }
      } else {
        addToast({
          title: "Video deleted",
          description: "The Video has been removed from your lesson. Note that the file wasn't deleted from storage as the local server is unavailable.",
        });
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete video",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      const response = await fetch(
        `/api/courses/${params.id}/lessons/${params.lessonId}/chats/${chatId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete chat');
      }

      // Remove the deleted chat from the state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      addToast({
        title: "Chat deleted",
        description: "The Chat has been removed from this PDF file.",
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      addToast({
        title: "Error",
        description: 'Failed to delete chat: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-3 px-2 min-h-[500px]">
        <div className="mb-4">
          <BreadcrumbNavigation
            courseId={params.id as string}
            courseName={course?.name}
            lessonId={params.lessonId as string}
            lessonName={lesson?.title}
          />
        </div>

        <div className="p-2 rounded-md mb-2">
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
          <TabsList className="bg-gray-50">
            <TabsTrigger
              value="pdfs"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <FileText className="h-4 w-4" />
              PDFs ({pdfs.length})
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <Video className="h-4 w-4" />
              Videos ({videos.length})
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
                  <CardFooter className="p-4 pt-0">
                    <div className="w-full">
                      <h4 className="text-sm font-semibold mb-2">Related Chats</h4>
                      {chats
                        .filter(chat =>
                          chat.resourceType === 'pdf' &&
                          chat.resourceId === pdf.id
                        )
                        .map(chat => (
                          <div
                            key={chat.id}
                            className="p-2 bg-gray-50 rounded mb-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <h3 className="font-medium text-sm">ChatId:{chat.id} -- {chat.title}</h3>
                            <Trash
                              className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
            {pdfs.length === 0 && (
              <p className="text-center text-gray-500 py-8">No PDFs available for this lesson</p>
            )}
          </TabsContent>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map(video => (
                <Card
                  key={video.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base truncate">{video.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="p-2 h-auto"
                          onClick={() => handleVideoClick(video)}
                        >
                          View
                        </Button>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteVideo(video)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <div className="w-full">
                      <h4 className="text-sm font-semibold mb-2">Related Chats</h4>
                      {chats
                        .filter(chat =>
                          chat.resourceType === 'video' &&
                          chat.resourceId === video.id
                        )
                        .map(chat => (
                          <div
                            key={chat.id}
                            className="p-2 bg-gray-50 rounded mb-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <h3 className="font-medium text-sm">ChatId:{chat.id} -- {chat.title}</h3>
                            <Trash
                              className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
            {videos.length === 0 && (
              <p className="text-center text-gray-500 py-8">No videos available for this lesson</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}