import { useState } from "react";
import { ChevronRight, CheckCircle, XCircle, Lightbulb, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_number: string;
  question_text: string;
}

interface StudentAnswer {
  id: string;
  student_answer: string;
  is_correct: boolean | null;
  feedback: string | null;
}

interface QuestionCardProps {
  question: Question;
  existingAnswer?: StudentAnswer;
  onAnswerSubmit: () => void;
  documentUrl?: string | null;
}

export const QuestionCard = ({ question, existingAnswer, onAnswerSubmit, documentUrl }: QuestionCardProps) => {
  const [answer, setAnswer] = useState(existingAnswer?.student_answer || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    isCorrect: boolean | null;
    feedback: string | null;
  }>({
    isCorrect: existingAnswer?.is_correct ?? null,
    feedback: existingAnswer?.feedback ?? null,
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
      // Insert the student answer
      const { data: answerData, error: answerError } = await supabase
        .from("student_answers")
        .insert({
          question_id: question.id,
          student_answer: answer.trim(),
        })
        .select()
        .single();

      if (answerError) throw answerError;

      // Call evaluation function with documentUrl for multimodal evaluation
      const { data: evalData, error: evalError } = await supabase.functions.invoke(
        "evaluate-answer",
        {
          body: {
            questionId: question.id,
            questionText: question.question_text,
            studentAnswer: answer.trim(),
            answerId: answerData.id,
            documentUrl: documentUrl,
          },
        }
      );

      if (evalError) {
        console.error("Evaluation error:", evalError);
        throw new Error(evalError.message || "Failed to evaluate answer");
      }

      setCurrentResult({
        isCorrect: evalData.isCorrect,
        feedback: evalData.feedback,
      });

      toast({
        title: evalData.isCorrect ? "Correct! 🎉" : "Not quite right",
        description: evalData.feedback,
        variant: evalData.isCorrect ? "default" : "destructive",
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

  const handleGetHint = async () => {
    setIsGettingHint(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-hint", {
        body: {
          questionText: question.question_text,
          previousHints: hints,
          documentUrl: documentUrl,
        },
      });

      if (error) {
        console.error("Hint error:", error);
        throw new Error(error.message || "Failed to get hint");
      }

      setHints((prev) => [...prev, data.hint]);
      setShowHints(true);
      
      toast({
        title: "Hint received!",
        description: "Check out your new hint below.",
      });
    } catch (error) {
      console.error("Hint error:", error);
      toast({
        title: "Failed to get hint",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsGettingHint(false);
    }
  };

  const hasSubmitted = currentResult.isCorrect !== null;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover">
      {/* Question Header */}
      <div className="bg-secondary/50 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {question.question_number}
          </span>
          <h3 className="font-medium text-foreground">Question {question.question_number}</h3>
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
            {question.question_text}
          </p>
        </div>

        {/* Hints Section */}
        {hints.length > 0 && showHints && (
          <div className="mb-6 space-y-3">
            <button 
              onClick={() => setShowHints(!showHints)}
              className="flex items-center gap-2 text-sm font-medium text-warning hover:text-warning/80 transition-colors"
            >
              <Lightbulb className="h-4 w-4" />
              {hints.length} Hint{hints.length > 1 ? "s" : ""} Available
              <ChevronRight className={`h-4 w-4 transition-transform ${showHints ? "rotate-90" : ""}`} />
            </button>
            <div className="space-y-2 pl-6">
              {hints.map((hint, index) => (
                <div 
                  key={index}
                  className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-foreground animate-fade-in"
                >
                  <span className="font-medium text-warning">Hint {index + 1}:</span> {hint}
                </div>
              ))}
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

            <Button
              variant="warning"
              onClick={handleGetHint}
              disabled={isGettingHint}
              className="flex-1 sm:flex-none"
            >
              {isGettingHint ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" />
                  Get Hint
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
