import { useState } from 'react';

export function usePdfHandler() {
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isPdfContentReady, setIsPdfContentReady] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handlePdfChange = (url: string, fileName: string) => {
    setPdfFileUrl(url);
    setPdfFileName(fileName);
    setIsPdfContentReady(false);
    setIsPdfLoading(url !== '');
    setPdfError(null); // Reset any previous errors

    // Clear any existing PDF content when new PDF is selected
    setPdfContent('');
  };

  const handlePdfTextExtracted = (text: string) => {
    setPdfContent(text);
    setIsPdfContentReady(true);
    setIsPdfLoading(false);
    setPdfError(null);
  };

  const handlePdfError = (error: string) => {
    setPdfError(error);
    setIsPdfLoading(false);
    setIsPdfContentReady(false);
    // We can still keep the URL and filename so the user knows which file failed
  };

  return {
    pdfFileUrl,
    pdfFileName,
    pdfContent,
    isPdfContentReady,
    isPdfLoading,
    pdfError,
    setPdfFileUrl,
    setPdfContent,
    setIsPdfContentReady,
    handlePdfChange,
    handlePdfTextExtracted,
    handlePdfError,
  };
}

