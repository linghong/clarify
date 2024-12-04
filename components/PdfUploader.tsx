import { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";

interface PdfUploaderProps {
  onPdfChange: (url: string | null) => void;
  hasActivePdf: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function PdfUploader({
  onPdfChange,
  hasActivePdf,
  className = '',
  children
}: PdfUploaderProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onPdfChange(url);
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => {
        if (hasActivePdf) {
          onPdfChange(null);
        } else {
          document.getElementById('pdf-upload')?.click();
        }
      }}
      className={className}
    >
      {children}
      <input
        id="pdf-upload"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </Button>
  );
}