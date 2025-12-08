# AI-Powered Math Teacher

An intelligent tutoring system that extracts questions from uploaded documents, evaluates student answers using AI, and provides guided hints without revealing solutions.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Features](#features)
- [Edge Functions](#edge-functions)
- [Database Schema](#database-schema)
- [Usage Guide](#usage-guide)

---

## Overview

This application enables educators and students to:

1. **Upload documents** (PDFs or images) containing math questions
2. **Automatically extract** questions using OCR processing
3. **View questions** alongside the original document in a split-view interface
4. **Submit answers** and receive AI-powered evaluation with feedback
5. **Request hints** that guide problem-solving without revealing final answers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  DocumentUpload  │  QuestionsList  │  QuestionCard              │
│  - Drag & drop   │  - PDF viewer   │  - Answer submission       │
│  - File upload   │  - Doc selector │  - Evaluation display      │
│  - Status UI     │  - Split view   │  - Hint requests           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lovable Cloud (Supabase)                      │
├─────────────────────────────────────────────────────────────────┤
│  Storage          │  Database        │  Edge Functions          │
│  - documents      │  - documents     │  - process-document      │
│    bucket         │  - questions     │  - evaluate-answer       │
│                   │  - student_      │  - get-hint              │
│                   │    answers       │                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External AI Services                          │
├─────────────────────────────────────────────────────────────────┤
│  Google Gemini (via Lovable AI)                                  │
│  - OCR & question extraction                                     │
│  - Answer evaluation (text & multimodal)                         │
│  - Hint generation                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Document Upload** → Storage bucket → `process-document` edge function
2. **OCR Processing** → Gemini extracts questions → Stored in `questions` table
3. **Answer Submission** → `evaluate-answer` edge function → Gemini evaluates → Stored in `student_answers`
4. **Hint Request** → `get-hint` edge function → Gemini generates guided hint

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack React Query |
| Backend | Lovable Cloud (Supabase) |
| Database | PostgreSQL |
| Storage | Supabase Storage |
| AI | Google Gemini (via Lovable AI) |
| Edge Functions | Deno runtime |

---

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A Lovable account (for cloud features)

### Local Development

```bash
# Clone the repository
git clone https://github.com/aahmedashraf/lovable-math-tutor
cd lovable-math-tutor

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

The following are automatically configured by Lovable Cloud:

- `VITE_SUPABASE_URL` - Backend API endpoint
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

### Deployment

Deploy via Lovable:
1. Click **Publish** in the Lovable editor
2. Click **Update** to push frontend changes live

> **Note**: Edge function changes deploy automatically.

---

## Features

### 1. Document Upload

- Supports **PDF** and **image** formats (PNG, JPG, JPEG, WebP)
- Drag-and-drop or click-to-upload interface
- Real-time upload status feedback
- Maximum file size: 10MB

### 2. OCR Question Extraction

- Automatic extraction of mathematical questions
- Preserves question numbering and structure
- Handles sub-questions (e.g., 1a, 2ii, (i), (ii))
- Maintains mathematical notation accuracy

### 3. Split-View Document Display

- Original PDF/image displayed alongside questions
- Toggle visibility of document viewer
- Scroll synchronization (future enhancement)

### 4. AI Answer Evaluation

| Document Type | Figure-Based Question | Behavior |
|---------------|----------------------|----------|
| Image | Yes | Multimodal evaluation with visual context |
| Image | No | Text-only evaluation |
| PDF | Yes | Cannot grade - returns "Review Required" |
| PDF | No | Text-only evaluation |

### 5. Guided Hints

- AI provides problem-solving guidance
- **Never reveals final answers**
- Considers visual context when available
- For PDF figure-based questions, reminds students to refer to original document

---

## Edge Functions

### `process-document`

Processes uploaded documents and extracts questions.

**Endpoint**: `POST /functions/v1/process-document`

**Payload**:
```json
{
  "documentId": "uuid",
  "fileUrl": "https://..."
}
```

### `evaluate-answer`

Evaluates student answers against questions.

**Endpoint**: `POST /functions/v1/evaluate-answer`

**Payload**:
```json
{
  "questionId": "uuid",
  "questionText": "string",
  "studentAnswer": "string",
  "documentUrl": "string (optional)"
}
```

**Response**:
```json
{
  "isCorrect": true | false | null,
  "feedback": "string",
  "cannotGrade": boolean
}
```

### `get-hint`

Generates a guided hint for a question.

**Endpoint**: `POST /functions/v1/get-hint`

**Payload**:
```json
{
  "questionText": "string",
  "documentUrl": "string (optional)"
}
```

---

## Database Schema

### `documents`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| filename | TEXT | Original filename |
| file_url | TEXT | Storage URL |
| status | TEXT | Processing status |
| uploaded_at | TIMESTAMP | Upload timestamp |

### `questions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | Foreign key to documents |
| question_number | TEXT | Question identifier |
| question_text | TEXT | Extracted question content |
| page_number | INT | Source page number |
| sort_order | INT | Display ordering |
| created_at | TIMESTAMP | Creation timestamp |

### `student_answers`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| question_id | UUID | Foreign key to questions |
| student_answer | TEXT | Submitted answer |
| is_correct | BOOLEAN | Evaluation result (nullable) |
| feedback | TEXT | AI feedback |
| submitted_at | TIMESTAMP | Submission timestamp |

---

## Usage Guide

### For Educators

1. **Upload a document** containing math questions
2. Wait for OCR processing to complete
3. Share the application with students
4. Review student submissions (future: analytics dashboard)

### For Students

1. Select a document from the dropdown
2. Toggle the PDF viewer to see original figures/tables
3. Read each question carefully
4. Submit your answer in the text area
5. Review feedback:
   - ✓ **Correct** (green) - Well done!
   - ✗ **Incorrect** (red) - Review the feedback
   - ⚠ **Review Required** (yellow) - Manual review needed
6. Use **Get Hint** for guidance (hints won't give away answers)

---

## Constraints & Design Decisions

1. **AI hints never reveal answers** - Pedagogical constraint to encourage learning
2. **PDF figure evaluation** - Cannot use multimodal AI on PDFs; marked as "Review Required"
3. **Image documents** - Full multimodal evaluation available
4. **Mathematical notation** - OCR prioritizes accuracy for symbols, exponents, fractions

---

