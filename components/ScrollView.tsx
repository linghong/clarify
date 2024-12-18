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

type TextItem = {
  str: string;
};

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
        console.log(textContent.items[0])
        const pageText = textContent.items
          .map((item) => {
            // Handle both TextItem and TextMarkedContent types
            if ((item as TextItem).str) {
              return (item as TextItem).str;
            }
            return ''; // Ignore items that are not of type TextItem
          })
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
    <div className="pdf-viewer h-full">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayoutPluginInstance]}
          defaultScale={SpecialZoomLevel.ActualSize}
        />
      </Worker>
    </div>
  );
}