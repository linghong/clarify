import { Button } from "@/components/ui/button";

interface PdfUploaderProps {
  children: React.ReactNode;
  className?: string;
  onPdfChange: (file: File) => void;
}

export default function PdfUploader({ children, className, onPdfChange }: PdfUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPdfChange(file);
    }
  };

  return (
    <Button asChild type="button" className={className}>
      <label>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        {children}
      </label>
    </Button>
  );
}