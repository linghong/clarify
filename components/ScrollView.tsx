import { useEffect, useCallback } from 'react';
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

  const extractPdfText = useCallback(async () => {
    if (!onTextExtracted || pdfUrl.startsWith('blob:')) {
      return;
    }

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item) => {
            if ((item as TextItem).str) {
              return (item as TextItem).str;
            }
            return '';
          })
          .join(' ');

        fullText += pageText + '\n';
      }

      onTextExtracted(fullText);
    } catch (error) {
      console.error('Error extracting PDF text:', error);
    }
  }, [onTextExtracted, pdfUrl]);

  useEffect(() => {
    extractPdfText();
  }, [extractPdfText]);

  return (
    <div className="pdf-viewer h-full">
      <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'>
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayoutPluginInstance]}
          defaultScale={SpecialZoomLevel.ActualSize}
        />
      </Worker>
    </div>
  );
}