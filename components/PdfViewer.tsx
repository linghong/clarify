import ScrollView from './ScrollView';

interface PdfViewerProps {
  pdfUrl: string;
  className?: string;
}

export default function PdfViewer({ pdfUrl, className = '' }: PdfViewerProps) {
  return (
    <div className={`h-full overflow-auto ${className}`}>
      <ScrollView pdfUrl={pdfUrl} />
    </div>
  );
}