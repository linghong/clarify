export const captureVideoFrame = async (videoRef: React.RefObject<HTMLVideoElement>) => {
  if (!videoRef.current) return null;

  try {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/png')
      .replace('data:image/png;base64,', '');

    return base64Image;
  } catch (error) {
    console.error('Error capturing video frame:', error);
    return null;
  }
};