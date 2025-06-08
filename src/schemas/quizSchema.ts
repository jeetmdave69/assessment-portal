import { z } from "zod";

export const quizSchema = z.object({
  quizTitle: z.string().min(1, "Quiz title is required"),
  totalMarks: z.string().min(1, "Total marks is required"),
  duration: z.string().min(1, "Duration is required"),
  maxAttempts: z.string().min(1, "Max attempts is required"),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  previewMode: z.boolean(),
  startDateTime: z.date({ required_error: "Start date is required" }),
  expiryDateTime: z.date({ required_error: "End date is required" }),
  questions: z
    .array(
      z.object({
        question: z.string().min(1, "Question cannot be empty"),
        image: z.any().optional(),
        explanation: z.string().optional(),
        options: z
          .array(
            z.object({
              text: z.string().min(1, "Option cannot be empty"),
              image: z.any().optional(),
              isCorrect: z.boolean(),
            })
          )
          .min(1, "At least one option is required"),
      })
    )
    .min(1, "At least one question is required"),
});

// Type for form values
export type QuizFormValues = z.infer<typeof quizSchema>;
