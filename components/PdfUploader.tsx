
import { Button } from "@/components/ui/button";

interface PdfUploaderProps {
  onPdfChange: (url: string, fileName: string) => void;
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
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onPdfChange(url, file.name);
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => {
        if (hasActivePdf) {
          onPdfChange('', '');
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