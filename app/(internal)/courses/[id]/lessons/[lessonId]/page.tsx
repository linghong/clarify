/* eslint-disable react/no-unescaped-entities */
"use client";
import React, { useState, useEffect, useCallback, MouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Video, Trash, BookmarkIcon, Plus } from "lucide-react";
import { LOCAL_SERVER_URL } from "@/lib/config";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { useToast } from "@/components/common/Toast";
import BreadcrumbNavigation from '@/app/(internal)/components/BreadcrumbNavigation';
import { formatTime } from '@/lib/utilityUtils';

import { Course, Lesson, PdfResource, VideoResource, Note } from "@/types/course";
import { Chat } from "@/types/course";
import { deleteFileFromLocalServer } from "@/lib/fileUtils";
import { VideoBookmark } from "@/entities/VideoBookmark";
import { StatusBadge } from "@/components/StatusBadge";
import { updateResourceStatusInDB } from "@/lib/updateResourceStatusInDB";


export default function LessonPage() {

  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null as Course | null);
  const [pdfs, setPdfs] = useState([] as PdfResource[]);
  const [videos, setVideos] = useState([] as VideoResource[]);
  const [lesson, setLesson] = useState(null as Lesson | null);
  const [mounted, setMounted] = useState(false);
  const [localServerAvailable, setLocalServerAvailable] = useState(false);
  const [chats, setChats] = useState([] as Chat[]);
  const [videoBookmarks, setVideoBookmarks] = useState({} as Record<number, VideoBookmark[]>);
  const [showVideoBookmarks, setShowVideoBookmarks] = useState(false);
  const [notes, setNotes] = useState([] as Note[]);

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

  const fetchVideoBookmarks = useCallback(async () => {
    try {
      const bookmarksByVideo: Record<number, VideoBookmark[]> = {};

      // Fetch bookmarks for each video
      await Promise.all(videos.map(async (video: VideoResource) => {
        const response = await fetch(`/api/videos/${video.id}/bookmarks`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          bookmarksByVideo[video.id] = data.bookmarks || [];
        } else {
          console.log(`Failed to fetch bookmarks for video ${video.id}:`, response.status);
        }
      }));
      setVideoBookmarks(bookmarksByVideo);
    } catch (error) {
      console.error('Error fetching video bookmarks:', error);
    }
  }, [videos]);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/notes?lessonId=${params.lessonId}`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch notes');

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, [params.lessonId]);

  useEffect(() => {
    setMounted(true);

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

  useEffect(() => {
    if (mounted && !loading) {
      // Fetch initial data without creating circular dependencies
      fetchCourseData();
      fetchLessonData();
      fetchPdfData();
      fetchVideos();
      fetchChats();
      fetchNotes();
    }
  }, [mounted, loading, fetchCourseData, fetchPdfData, fetchLessonData, fetchVideos, fetchChats, fetchNotes]);

  // Add a separate effect to handle video bookmarks after videos are loaded
  useEffect(() => {
    if (videos.length > 0 && mounted && !loading) {
      fetchVideoBookmarks();
    }
  }, [videos, fetchVideoBookmarks, mounted, loading]);

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

  const updateResourceStatus = async (
    type: 'pdf' | 'video' | 'lesson',
    id: number,
    status: 'not_started' | 'in_progress' | 'completed'
  ) => {
    try {
      // Add validation for lesson status changes
      if (type === 'lesson') {
        // Case 1: Block changing to "not_started" if resources are in progress/completed
        if (status === 'not_started') {
          const hasActiveResources = [...pdfs, ...videos].some(
            resource => resource.status === 'in_progress' || resource.status === 'completed'
          );

          if (hasActiveResources) {
            addToast({
              title: "Action Blocked",
              description: "Cannot mark lesson as 'not started' when resources are in progress or completed.",
              variant: "destructive",
            });
            return; // Prevent the status update
          }
        }

        // Case 2: Block changing to "in_progress" if no resources are active
        if (status === 'in_progress' && lesson?.status === 'not_started') {
          const hasActiveResources = [...pdfs, ...videos].some(
            resource => resource.status === 'in_progress' || resource.status === 'completed'
          );

          if (!hasActiveResources && pdfs.length + videos.length > 0) {
            addToast({
              title: "Action Blocked",
              description: "Cannot mark lesson as 'in progress' until you've started viewing resources.",
              variant: "destructive",
            });
            return; // Prevent the status update
          }
        }
      }

      // Rest of your existing function logic...
      await updateResourceStatusInDB(
        type,
        id,
        status,
        type !== 'lesson' ? parseInt(params.lessonId as string) : undefined
      );

      // Update local state based on resource type
      if (type === 'pdf') {
        setPdfs((prev: PdfResource[]) => prev.map(p => p.id === id ? { ...p, status } : p));
      } else if (type === 'video') {
        setVideos((prev: VideoResource[]) => prev.map(v => v.id === id ? { ...v, status } : v));
      } else if (type === 'lesson') {
        setLesson((prev: Lesson | null) => prev ? { ...prev, status } : null);
      }

      // If a resource status changes to in_progress, and the lesson is not_started,
      // also update the lesson status state
      if ((type === 'pdf' || type === 'video') &&
        status === 'in_progress' &&
        lesson?.status === 'not_started') {
        setLesson((prev: Lesson | null) => prev ? { ...prev, status: 'in_progress' } : null);
      }

      addToast({
        title: "Status updated",
        description: `Resource marked as ${status.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      addToast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const deletionWarning = (type: 'pdf' | 'video') => {
    return `The ${type} metadata was successfully removed from database, but the file couldn't be deleted from your local storage as the local server is unavailable. Please delete it manually.`
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
        setPdfs((prev: PdfResource[]) => prev.filter(p => p.id !== pdf.id));
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
            description: deletionWarning('pdf'),
            variant: "default",
          });
        }
      } else {
        addToast({
          title: "PDF deleted",
          description: deletionWarning('pdf'),
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
        setVideos((prev: VideoResource[]) => prev.filter(v => v.id !== video.id));
      }

      if (localServerAvailable) {
        try {
          const deleteResult = await deleteFileFromLocalServer(video.url);

          if (!deleteResult || !deleteResult.success) {
            console.warn('Could not delete the video file:', deleteResult?.error || 'Unknown error');
            addToast({
              title: "Warning",
              description: deletionWarning('video'),
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
            description: deletionWarning('video'),
            variant: "default",
          });
        }
      } else {
        addToast({
          title: "Video deleted",
          description: deletionWarning('video'),
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
      setChats((prev: Chat[]) => prev.filter(chat => chat.id !== chatId));
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

  const handleDeleteBookmark = async (videoId: number, bookmarkId: number) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete bookmark');
      }

      // Update state to remove the deleted bookmark
      setVideoBookmarks((prev: Record<number, VideoBookmark[]>) => ({
        ...prev,
        [videoId]: prev[videoId]?.filter((b: VideoBookmark) => b.id !== bookmarkId) || []
      }));

      addToast({
        title: "Bookmark deleted",
        description: "The bookmark has been removed from this video.",
      });
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      addToast({
        title: "Error",
        description: "Failed to delete bookmark",
        variant: "destructive"
      });
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      const response = await fetch(
        `/api/notes/${noteId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete note');
      }

      // Remove the deleted note from the state
      setNotes((prev) => prev.filter(note => note.id !== noteId));
      addToast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      addToast({
        title: "Error",
        description: 'Failed to delete note: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive"
      });
    }
  };

  const filteredChats = chats.filter((chat: Chat) => chat.resourceType === 'lesson');

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
            <div className="text-green-700 p-2">
              '✓ Connected to local storage'
            </div>
          ) : (
            <span>
              ⚠ Local server not running -
              <a href="https://github.com/linghong/smartchat-local" className="ml-2 text-red-600 hover:underline">
                Download and install Local Server
              </a>
            </span>
          )}
        </div>
        <div className="mb-4 flex justify-between items-center">
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-gray-600 text-xl font-bold">{lesson?.title}</p>
              <StatusBadge
                status={lesson?.status as 'not_started' | 'in_progress' | 'completed'}
                onStatusChange={(status) => updateResourceStatus('lesson', parseInt(params.lessonId as string), status)}
                size="sm"
              />
            </div>
            <p className="text-gray-600">{lesson?.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-900 hover:bg-slate-700 text-white flex items-center gap-2"
              onClick={() => router.push(`/dashboard?courseId=${params.id}&lessonId=${params.lessonId}&courseName=${encodeURIComponent(course?.name || '')}&lessonName=${encodeURIComponent(lesson?.title || '')}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Content
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pdfs">
          <TabsList className="bg-gray-50 px-5r">
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
            <TabsTrigger
              value="chats"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
              onClick={() => setShowVideoBookmarks(!showVideoBookmarks)}
            >
              <FileText className="h-4 w-4" />
              Lesson Chats ({filteredChats.length})
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <FileText className="h-4 w-4" />
              Lesson Notes ({notes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs">
            <div className="grid bg-gray-100 border border-gray-300 p-2 rounded-md grid-cols-1 md:grid-cols-2 gap-4">
              {pdfs.map((pdf: PdfResource) => (
                <Card
                  key={pdf.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePdfClick(pdf)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">{pdf.name}</CardTitle>
                        <StatusBadge
                          status={pdf.status || 'not_started'}
                          onStatusChange={(status) => updateResourceStatus('pdf', pdf.id, status)}
                          size="sm"
                        />
                      </div>
                    </div>
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
                  <CardFooter className="flex flex-col gap-2 p-4 pt-0 ">
                    <div className="w-full">
                      <h4 className="text-sm font-semibold mb-2">Related Chats:</h4>
                      {chats
                        .filter((chat: Chat) =>
                          chat.resourceType === 'pdf' &&
                          chat.resourceId === pdf.id
                        )
                        .map((chat) => (
                          <div
                            key={chat.id}
                            className="p-2 bg-gray-50 rounded mb-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <h3 className="font-medium text-sm">ChatId:{chat.id} -- {chat.title}</h3>
                            <Trash
                              className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                              onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                            />
                          </div>
                        ))}
                      {chats.filter((chat) => chat.resourceType === 'pdf' && chat.resourceId === pdf.id).length === 0 && (
                        <p className="text-gray-500 text-sm italic">No chats available</p>
                      )}
                    </div>
                    <div className="w-full">
                      <h4 className="text-sm font-semibold mb-2">Related Notes:</h4>
                      {notes
                        .filter((note) =>
                          note.resourceType === 'pdf' &&
                          note.resourceId === pdf.id
                        )
                        .map((note) => (
                          <div
                            key={note.id}
                            className="p-2 bg-gray-50 rounded mb-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <h3 className="font-medium text-sm truncate">{note.title || `Note ${note.id}`}</h3>
                            <Trash
                              className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                              onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteNote(note.id);
                              }}
                            />
                          </div>
                        ))}
                      {notes.filter((note) => note.resourceType === 'pdf' && note.resourceId === pdf.id).length === 0 && (
                        <p className="text-gray-500 text-sm italic">No notes available</p>
                      )}
                    </div>
                    {pdfs.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No PDFs available for this lesson</p>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map(video => (
                <Card
                  key={video.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleVideoClick(video)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">{video.name}</CardTitle>
                        <StatusBadge
                          status={video.status || 'not_started'}
                          onStatusChange={(status) => updateResourceStatus('video', video.id, status)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <p className="text-sm text-gray-500">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>

                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowVideoBookmarks(!showVideoBookmarks);
                          }}
                        >
                          <BookmarkIcon className="h-3 w-3 mr-1" />
                          ShowBookmarks ({videoBookmarks[video.id]?.length || 0})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleVideoClick(video)}
                        >
                          View Video
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
                        .filter((chat: Chat) =>
                          chat.resourceType === 'video' &&
                          chat.resourceId === video.id
                        )
                        .map((chat: Chat) => (
                          <div
                            key={chat.id}
                            className="p-2 bg-gray-50 rounded mb-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <h3 className="font-medium text-sm">{chat.title}</h3>
                            <Trash
                              className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                              onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                            />
                          </div>
                        ))}
                      {chats.filter((chat: Chat) => chat.resourceType === 'video' && chat.resourceId === video.id).length === 0 && (
                        <p className="text-gray-500 text-sm italic">No chats available</p>
                      )}

                      {/* Toggle bookmark details */}
                      {videoBookmarks[video.id]?.length === 0 && (
                        <p className="text-gray-500 text-sm italic">No bookmarks available</p>
                      )}
                      {showVideoBookmarks && (
                        <div className="mt-4 pt-4 border-t border-gray-200">

                          {videoBookmarks[video.id] && videoBookmarks[video.id].length > 0 && videoBookmarks[video.id].map((bookmark: VideoBookmark) => (
                            <div
                              key={bookmark.id}
                              className="p-2 border border-emerald-100 rounded mb-2 hover:bg-emerald-100 cursor-pointer transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{formatTime(bookmark.timestamp)}</span>
                                <Trash
                                  className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBookmark(video.id, bookmark.id);
                                  }}
                                />
                              </div>
                              {bookmark.label && (
                                <span className="inline-block px-2 py-1 text-emerald-800 text-xs rounded-full mb-1">
                                  {bookmark.label}
                                </span>
                              )}
                              <p className="text-sm">{bookmark.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardFooter>
                  <div className="w-full mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold mb-2">Related Notes</h4>
                    {notes
                      .filter((note) =>
                        note.resourceType === 'video' &&
                        note.resourceId === video.id
                      )
                      .map((note) => (
                        <div
                          key={note.id}
                          className="p-2 bg-gray-50 rounded mb-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                        >
                          <div>
                            <h3 className="font-medium text-sm truncate">{note.title || `Note ${note.id}`}</h3>
                          </div>
                          <Trash
                            className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                          />
                        </div>
                      ))}
                    {notes.filter((note) => note.resourceType === 'video' && note.resourceId === video.id).length === 0 && (
                      <p className="text-gray-500 text-sm italic">No notes available</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {videos.length === 0 && (
              <p className="text-center text-gray-500 py-8">No videos available for this lesson</p>
            )}
          </TabsContent>
          <TabsContent value="chats">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showVideoBookmarks && chats.length > 0 && filteredChats
                .map(chat => (
                  <Card
                    key={chat.id}
                    className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base truncate">{chat.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          Created {new Date(chat.createdAt).toLocaleDateString()}
                        </span>
                        <Trash
                          className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {chats.filter(chat => chat.resourceType === 'lesson').length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500">No lesson chats available. Start a chat from the dashboard.</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="notes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.filter((note) => note.resourceType === 'lesson').map((note) => (
                <Card
                  key={note.id}
                  className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base truncate">{note.title || `Note ${note.id}`}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Last updated {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                      <Trash
                        className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {notes.filter((note) => note.resourceType === 'lesson').length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500">No lesson notes available. Create notes from the dashboard.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}