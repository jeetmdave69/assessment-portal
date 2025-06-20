import { z } from "zod";

export const quizSchema = z.object({
  quizTitle: z.string().min(1, "Quiz title is required"),
  description: z.string().optional(),
  totalMarks: z.string().min(1, "Total marks is required"),
  duration: z.string().min(1, "Duration is required"),
  startDateTime: z.date({ required_error: "Start date is required" }),
  expiryDateTime: z.date({ required_error: "End date is required" }),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  maxAttempts: z.string().min(1, "Max attempts is required"),
  previewMode: z.boolean(),
  showCorrectAnswers: z.boolean(),
  passingScore: z.string().min(1, "Passing score is required"),
  questions: z
    .array(
      z.object({
        question: z.string().min(1, "Question cannot be empty"),
        questionType: z.enum(["single", "multiple"], {
          required_error: "Question type is required",
        }),
        image: z.any().optional(),
        explanation: z.string().optional(),
        marks: z.string().min(1, "Marks are required"),
        options: z
          .array(
            z.object({
              text: z.string().min(1, "Option cannot be empty"),
              image: z.any().optional(),
              isCorrect: z.boolean(),
            })
          )
          .min(2, "At least two options are required")
          .refine(
            (options) => options.some((option) => option.isCorrect),
            "At least one correct option is required"
          )
          .refine(
            (options) => {
              const uniqueOptions = new Set(options.map((o) => o.text));
              return uniqueOptions.size === options.length;
            },
            "Options must be unique"
          ),
      })
    )
    .min(1, "At least one question is required")
    .refine(
      (questions) => {
        return questions.every((q) => {
          if (q.questionType === "single") {
            return q.options.filter((o) => o.isCorrect).length === 1;
          }
          return true;
        });
      },
      {
        message: "Single-select questions must have exactly one correct answer",
        path: ["questions"],
      }
    ),
});

// Type for form values
export type QuizFormValues = z.infer<typeof quizSchema>;