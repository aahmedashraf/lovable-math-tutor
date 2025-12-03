import { useState, useEffect } from "react";
import { FileQuestion, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/QuestionCard";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  document_id: string;
}

interface Document {
  id: string;
  filename: string;
  uploaded_at: string;
  status: string;
}

interface QuestionsListProps {
  onBack: () => void;
}

export const QuestionsList = ({ onBack }: QuestionsListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("status", "completed")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      
      // Auto-select the most recent document if available
      if (data && data.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestions = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("document_id", documentId)
        .order("question_number", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocumentId) {
      fetchQuestions(selectedDocumentId);
    }
  }, [selectedDocumentId]);

  const handleAnswerSubmit = () => {
    // Optionally refresh data after submission
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className="p-4 rounded-full bg-secondary">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No questions yet</h3>
          <p className="text-muted-foreground max-w-md">
            Upload a document containing math questions to get started. The AI will extract and display them here.
          </p>
        </div>
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Upload Document
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Upload
        </Button>

        <div className="flex-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Document:</span>
          <select
            value={selectedDocumentId || ""}
            onChange={(e) => setSelectedDocumentId(e.target.value)}
            className="flex-1 sm:flex-none min-w-[200px] h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
        </div>

        <Button variant="outline" size="icon" onClick={fetchDocuments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Questions Summary */}
      <div className="bg-secondary/50 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{questions.length}</span> question{questions.length !== 1 ? "s" : ""} extracted from this document
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onAnswerSubmit={handleAnswerSubmit}
          />
        ))}
      </div>
    </div>
  );
};
