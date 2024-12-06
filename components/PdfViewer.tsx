import ScrollView from './ScrollView';

interface PdfViewerProps {
  pdfUrl: string;
  className?: string;
  onTextExtracted?: (text: string) => void;
}

export default function PdfViewer({ pdfUrl, className = '', onTextExtracted }: PdfViewerProps) {
  return (
    <div className={`h-full overflow-auto ${className}`}>
      <ScrollView
        pdfUrl={pdfUrl}
        onTextExtracted={onTextExtracted}
      />
    </div>
  );
}