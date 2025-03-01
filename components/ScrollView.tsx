import { useEffect, useCallback, useState } from 'react';
import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core';
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
  const [pdfError, setPdfError] = useState<string | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

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
      setPdfError(null);
    } catch (error) {
      console.error('Error extracting PDF text:', error);
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
  }, [onTextExtracted, pdfUrl]);

  useEffect(() => {
    extractPdfText();
  }, [extractPdfText]);


  const getPdfDocument = async () => {
    try {
      if (!pdfUrl) return;
      console.log('pdfUrl', pdfUrl);
      // Try to load the PDF to check if it's valid
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('response', response);

      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // If we get here, the PDF is valid
      setPdfError(null);

      return pdf;
    } catch (error) {
      console.error('PDF validation error:', error);
      if (error instanceof Error) {
        setPdfError(error.message);
      } else {
        setPdfError('Failed to load PDF');
      }
    }
  };


  if (pdfError) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white p-6">
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
    <div className="pdf-viewer h-full w-full">
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