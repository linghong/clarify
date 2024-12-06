import { useEffect } from 'react';
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import * as pdfjsLib from 'pdfjs-dist';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface ScrollViewProps {
  pdfUrl: string;
  onTextExtracted?: (text: string) => void;
}

export default function ScrollView({ pdfUrl, onTextExtracted }: ScrollViewProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const extractPdfText = async () => {
    if (!onTextExtracted) return;

    try {
      const response = await fetch(pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      onTextExtracted(fullText);
    } catch (error) {
      console.error('Error extracting PDF text:', error);
    }
  };

  useEffect(() => {
    extractPdfText();
  }, [pdfUrl]);

  return (
    <div className="h-full">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayoutPluginInstance]}
          defaultScale={SpecialZoomLevel.PageWidth}
        />
      </Worker>
    </div>
  );
}