import { useEffect, useCallback, useState, useRef } from 'react';
import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import * as pdfjsLib from 'pdfjs-dist';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { updateResourceStatusInDB } from '@/lib/updateResourceStatusInDB';

interface ScrollViewProps {
  pdfUrl: string;
  onTextExtracted?: (text: string) => void;
  resourceId?: number;
  lessonId?: number;
  className?: string;
}

// Define the correct types for PDF.js items
type TextItem = {
  str: string;
};

type TextMarkedContent = {
  // TextMarkedContent doesn't have str property
  type: string;
};

export default function ScrollView({
  pdfUrl,
  onTextExtracted,
  resourceId = 0,
  lessonId = 0,
  className = ""
}: ScrollViewProps) {
  const [pdfError, setPdfError] = useState<string | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const pdfRef = useRef<HTMLDivElement>(null);

  const getPdfDocument = useCallback(async () => {
    try {
      if (!pdfUrl) return;
      // Try to load the PDF to check if it's valid
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // If we get here, the PDF is valid
      setPdfError(null);

      return pdf;
    } catch (error) {
      if (error instanceof Error) {
        setPdfError(error.message);
      } else {
        setPdfError('Failed to load PDF');
      }
    }
  }, [pdfUrl]);

  const extractPdfText = useCallback(async () => {
    if (!onTextExtracted || pdfUrl.startsWith('blob:')) {
      return;
    }

    const pdf = await getPdfDocument();
    if (!pdf) return;

    try {
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: TextItem | TextMarkedContent) => {
            // Check if item has str property (is a TextItem)
            if ('str' in item) {
              return item.str;
            }
            // For TextMarkedContent which doesn't have a str property
            return '';
          })
          .join(' ');
        fullText += pageText + '\n';
      }

      onTextExtracted(fullText);
      setPdfError(null);
    } catch (error) {
      if (error instanceof Error) {
        setPdfError(error.message);
        if (onTextExtracted) {
          onTextExtracted('');
        }
      } else {
        setPdfError('Failed to extract text from PDF');
        if (onTextExtracted) {
          onTextExtracted('');
        }
      }
    }
  }, [onTextExtracted, pdfUrl, getPdfDocument]);

  useEffect(() => {
    extractPdfText();
  }, [extractPdfText]);

  // Track PDF scrolling for resource status
  useEffect(() => {
    if (resourceId > 0 && pdfRef.current) {
      const scrollContainer = pdfRef.current;

      const handleScroll = () => {
        updateResourceStatusInDB('pdf', resourceId, 'in_progress', lessonId);
      };

      scrollContainer.addEventListener('scroll', handleScroll);

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [resourceId, lessonId, pdfRef]);

  if (pdfError) {
    return (
      <div className={`flex items-center justify-center h-full w-full bg-white p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-2">PDF Error</h3>
          <p className="text-gray-700 mb-4">{pdfError}</p>
          <p className="text-sm text-gray-500">
            This PDF file may be corrupted or have an invalid structure for viewing here.
            Please try uploading a different file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer h-full w-full ${className}`} ref={pdfRef}>
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