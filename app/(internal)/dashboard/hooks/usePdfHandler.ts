import { useState } from 'react';

export function usePdfHandler() {
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isPdfContentReady, setIsPdfContentReady] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handlePdfChange = (url: string, fileName: string) => {
    setPdfFileUrl(url);
    setPdfFileName(fileName);
    setIsPdfContentReady(false);
    setIsPdfLoading(url !== '');

    // Clear any existing PDF content when new PDF is selected
    setPdfContent('');
  };

  const handlePdfTextExtracted = (text: string) => {
    setPdfContent(text);
    setIsPdfContentReady(true);
    setIsPdfLoading(false);
  };

  return {
    pdfFileUrl,
    pdfFileName,
    pdfContent,
    isPdfContentReady,
    isPdfLoading,
    setPdfFileUrl,
    setPdfContent,
    setIsPdfContentReady,
    handlePdfChange,
    handlePdfTextExtracted,
  };
}

