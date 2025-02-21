import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // For YouTube videos
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtube.com')
        ? url.split('v=')[1]?.split('&')[0]
        : url.split('youtu.be/')[1];

      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await response.json();
      return NextResponse.json({
        title: data.title,
        author: data.author_name
      });
    }

    // For Vimeo videos
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1];
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
      const data = await response.json();
      return NextResponse.json({
        title: data.title,
        author: data.author_name
      });
    }

    return NextResponse.json({ title: 'Untitled Video', author: 'Unknown' });
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json({ title: 'Untitled Video', author: 'Unknown' });
  }
}