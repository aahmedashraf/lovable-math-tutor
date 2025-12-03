import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onUploadComplete: () => void;
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
    // Validate file type (images and PDFs)
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (PNG, JPG, WEBP) or PDF file.",
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
      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({ filename: file.name, status: "processing" })
        .select()
        .single();

      if (docError) throw docError;

      // Upload file to storage
      const filePath = `${docData.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      setUploadStatus("processing");

      // Call OCR processing function
      const { data: processData, error: processError } = await supabase.functions.invoke(
        "process-document",
        {
          body: {
            documentId: docData.id,
            fileUrl: urlData.publicUrl,
            filename: file.name,
          },
        }
      );

      if (processError) {
        console.error("Processing error:", processError);
        throw new Error(processError.message || "Failed to process document");
      }

      setUploadStatus("complete");
      toast({
        title: "Document processed!",
        description: `Successfully extracted ${processData?.questionsCount || 0} questions.`,
      });

      setTimeout(() => {
        onUploadComplete();
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
        return "Drop your document here or click to browse";
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
          accept="image/*,.pdf"
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
                Supports PNG, JPG, WEBP, and PDF files (max 10MB)
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
            <Button variant="outline" size="sm" className="mt-2" disabled={isUploading}>
              Select File
            </Button>
          )}
        </div>
      </label>
    </Card>
  );
};
