export interface Question {
  question_id: string;
  text: string;
  diagrams: string[]; // base64 encoded images
}

export interface GradingResult {
  correct: boolean;
  feedback: string;
  confidence: number;
}
