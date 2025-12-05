export interface Diagram {
  image_base64: string;
}

export interface Question {
  question_id: string;
  text: string;
  diagrams: Diagram[];
}

export interface GradingResult {
  correct: boolean;
  feedback: string;
  confidence: number;
}
