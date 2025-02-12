import { Button } from "@/components/ui/button";

interface PdfUploaderProps {
  onPdfChange: (url: string, fileName: string, file?: File) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function PdfUploader({
  onPdfChange,
  className = '',
  children
}: PdfUploaderProps) {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange", event.target.files);
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onPdfChange(url, file.name, file);
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => {
        document.getElementById('pdf-upload')?.click();
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