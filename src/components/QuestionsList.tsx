import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/QuestionCard";
import { Question } from "@/types/question";

interface QuestionsListProps {
  questions: Question[];
  onBack: () => void;
}

export const QuestionsList = ({ questions, onBack }: QuestionsListProps) => {
  const handleAnswerSubmit = () => {
    // Optionally track progress
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className="p-4 rounded-full bg-secondary">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No questions yet</h3>
          <p className="text-muted-foreground max-w-md">
            Upload a PDF containing math questions to get started. The AI will extract and display them here.
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Upload
        </Button>
      </div>

      {/* Questions Summary */}
      <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{questions.length}</span> question{questions.length !== 1 ? "s" : ""} extracted from this document
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.question_id}
            question={question}
            questionIndex={index}
            onAnswerSubmit={handleAnswerSubmit}
          />
        ))}
      </div>
    </div>
  );
};
