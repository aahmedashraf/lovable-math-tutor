import { Question, GradingResult } from "@/types/question";

const API_BASE_URL = "https://sheepish-arla-unalleviatedly.ngrok-free.dev";

export async function uploadPdf(file: File): Promise<Question[]> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to upload PDF");
  }

  return response.json();
}

export async function markAnswer(
  questionId: string,
  studentAnswer: string
): Promise<GradingResult> {
  const response = await fetch(`${API_BASE_URL}/mark-answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question_id: questionId,
      student_answer: studentAnswer,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to mark answer");
  }

  return response.json();
}
