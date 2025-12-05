import { useState } from "react";
import { ChevronRight, CheckCircle, XCircle, Lightbulb, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { markAnswer } from "@/lib/api";
import { Question } from "@/types/question";

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  onAnswerSubmit: () => void;
}

export const QuestionCard = ({ question, questionIndex, onAnswerSubmit }: QuestionCardProps) => {
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    isCorrect: boolean | null;
    feedback: string | null;
  }>({
    isCorrect: null,
    feedback: null,
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast({
        title: "Empty answer",
        description: "Please enter your answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await markAnswer(question.question_id, answer.trim());

      setCurrentResult({
        isCorrect: result.correct,
        feedback: result.feedback,
      });

      toast({
        title: result.correct ? "Correct! 🎉" : "Not quite right",
        description: result.feedback,
        variant: result.correct ? "default" : "destructive",
      });

      onAnswerSubmit();
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSubmitted = currentResult.isCorrect !== null;
  const questionNumber = questionIndex + 1;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover">
      {/* Question Header */}
      <div className="bg-secondary/50 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {questionNumber}
          </span>
          <h3 className="font-medium text-foreground">Question {questionNumber}</h3>
          {hasSubmitted && (
            <span className={`ml-auto flex items-center gap-1 text-sm font-medium ${currentResult.isCorrect ? "text-success" : "text-destructive"}`}>
              {currentResult.isCorrect ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Incorrect
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6">
        <div className="prose prose-sm max-w-none mb-6">
          <p className="text-foreground whitespace-pre-wrap font-mono text-base leading-relaxed">
            {question.text}
          </p>
        </div>

        {/* Diagrams Section */}
        {question.diagrams && question.diagrams.length > 0 && (
          <div className="mb-6 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Figures/Diagrams:</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {question.diagrams.map((diagram, index) => {
                if (!diagram?.image_base64) return null;
                return (
                  <div 
                    key={index}
                    className="border border-border rounded-lg overflow-hidden bg-muted/30 p-2"
                  >
                    <img
                      src={`data:image/png;base64,${diagram.image_base64}`}
                      alt={`Diagram ${index + 1} for question ${questionNumber}`}
                      className="w-full h-auto rounded"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Answer Input */}
        <div className="space-y-4">
          <Textarea
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="min-h-[100px] font-mono resize-none"
            disabled={isSubmitting}
          />

          {/* Feedback Display */}
          {hasSubmitted && currentResult.feedback && (
            <div className={`p-4 rounded-lg animate-slide-up ${
              currentResult.isCorrect 
                ? "bg-success/10 border border-success/20" 
                : "bg-destructive/10 border border-destructive/20"
            }`}>
              <p className="text-sm font-medium mb-1">
                {currentResult.isCorrect ? "Great job!" : "Feedback:"}
              </p>
              <p className="text-sm text-muted-foreground">{currentResult.feedback}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !answer.trim()}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Answer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
