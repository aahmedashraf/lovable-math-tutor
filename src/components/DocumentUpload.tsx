import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { uploadPdf } from "@/lib/api";
import { Question } from "@/types/question";

interface DocumentUploadProps {
  onUploadComplete: (questions: Question[]) => void;
}

export const DocumentUpload = ({ onUploadComplete }: DocumentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Validate file type (PDF only for the custom backend)
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadStatus("uploading");
    setIsUploading(true);

    try {
      setUploadStatus("processing");

      const questions = await uploadPdf(file);

      setUploadStatus("complete");
      toast({
        title: "Document processed!",
        description: `Successfully extracted ${questions.length} questions.`,
      });

      setTimeout(() => {
        onUploadComplete(questions);
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-8 w-8 text-primary animate-spin" />;
      case "complete":
        return <CheckCircle className="h-8 w-8 text-success" />;
      case "error":
        return <AlertCircle className="h-8 w-8 text-destructive" />;
      default:
        return <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case "uploading":
        return "Uploading document...";
      case "processing":
        return "Extracting math questions with AI...";
      case "complete":
        return "Questions extracted successfully!";
      case "error":
        return "Failed to process document";
      default:
        return "Drop your PDF here or click to browse";
    }
  };

  return (
    <Card
      className={`
        relative overflow-hidden border-2 border-dashed transition-all duration-300 cursor-pointer group
        ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
        ${uploadStatus === "complete" ? "border-success bg-success/5" : ""}
        ${uploadStatus === "error" ? "border-destructive bg-destructive/5" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center p-8 sm:p-12 cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`
            p-4 rounded-full transition-all duration-300
            ${uploadStatus === "idle" ? "bg-secondary group-hover:bg-primary/10" : ""}
            ${uploadStatus === "complete" ? "bg-success/10" : ""}
            ${uploadStatus === "error" ? "bg-destructive/10" : ""}
          `}>
            {getStatusIcon()}
          </div>
          
          <div>
            <p className="text-lg font-medium text-foreground">
              {getStatusText()}
            </p>
            {uploadStatus === "idle" && (
              <p className="text-sm text-muted-foreground mt-1">
                Supports PDF files (max 10MB)
              </p>
            )}
            {selectedFile && uploadStatus !== "idle" && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                {selectedFile.name}
              </p>
            )}
          </div>

          {uploadStatus === "idle" && (
            <Button variant="outline" size="sm" className="mt-2 pointer-events-none" tabIndex={-1}>
              Select File
            </Button>
          )}
        </div>
      </label>
    </Card>
  );
};
