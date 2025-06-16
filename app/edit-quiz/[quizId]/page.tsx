"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  Snackbar,
  Stack,
  TextField,
  Typography,
  Paper,
  Divider,
  IconButton,
} from "@mui/material";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { quizSchema, QuizFormValues } from "@/schemas/quizSchema";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import DeleteIcon from "@mui/icons-material/Delete";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditQuizPage() {
  const params = useParams() as { quizId: string };
  const quizId = params.quizId;

  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [errorToast, setErrorToast] = useState(false);

  const methods = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      quizTitle: "",
      totalMarks: "0",
      duration: "0",
      startDateTime: new Date(),
      expiryDateTime: new Date(),
      shuffleQuestions: false,
      shuffleOptions: false,
      maxAttempts: "1",
      previewMode: false,
      questions: [],
    },
  });

  const { register, control, handleSubmit, setValue, watch, reset } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  useEffect(() => {
    async function fetchQuiz() {
      setLoading(true);

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId);

      if (quizError || questionsError) {
        setErrorToast(true);
        setLoading(false);
        return;
      }

      if (quiz && questions) {
        const correctMap = (q: any) => {
          const correctAnswers = JSON.parse(q.correct_answers || "[]");
          let optionsParsed = [];
          try {
            optionsParsed = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
          } catch {
            optionsParsed = [];
          }

          return {
            question: q.question_text,
            image: q.image_url || null,
            explanation: q.explanation || "",
            options: optionsParsed.map((o: any) => {
              const text = typeof o === "string" ? o : o.text;
              return {
                text,
                image: o.image || null,
                isCorrect: correctAnswers.includes(text),
              };
            }),
          };
        };

        const quizTitleFromQuestions = questions.length > 0 ? questions[0].quiz_title : quiz.quiz_name;

        reset({
          quizTitle: quizTitleFromQuestions || "",
          totalMarks: quiz.total_marks?.toString() || "0",
          duration: quiz.duration?.toString() || "0",
          startDateTime: quiz.start_time ? new Date(quiz.start_time) : new Date(),
          expiryDateTime: quiz.end_time ? new Date(quiz.end_time) : new Date(),
          shuffleQuestions: quiz.shuffle_questions || false,
          shuffleOptions: quiz.shuffle_options || false,
          maxAttempts: quiz.max_attempts?.toString() || "1",
          previewMode: quiz.preview_mode || false,
          questions: questions.map(correctMap),
        });
      }

      setLoading(false);
    }

    fetchQuiz();
  }, [quizId, reset]);

  const onSubmit = async (data: QuizFormValues) => {
    const { error: updateError } = await supabase
      .from("quizzes")
      .update({
        quiz_name: data.quizTitle,
        total_marks: parseInt(data.totalMarks),
        duration: parseInt(data.duration),
        start_time: data.startDateTime.toISOString(),
        end_time: data.expiryDateTime.toISOString(),
        shuffle_questions: data.shuffleQuestions,
        shuffle_options: data.shuffleOptions,
        max_attempts: parseInt(data.maxAttempts),
        preview_mode: data.previewMode,
      })
      .eq("id", quizId);

    await supabase.from("questions").delete().eq("quiz_id", quizId);

    const questionsPayload = data.questions.map((q) => ({
      quiz_id: quizId,
      quiz_title: data.quizTitle, // ✅ Store quiz title with question
      question_text: q.question,
      explanation: q.explanation,
      options: JSON.stringify(q.options.map((o) => ({ text: o.text, image: o.image, isCorrect: o.isCorrect }))),
      correct_answers: JSON.stringify(q.options.filter((o) => o.isCorrect).map((o) => o.text)),
      image_url: q.image || null,
    }));

    const { error: insertError } = await supabase.from("questions").insert(questionsPayload);

    if (!updateError && !insertError) {
      setShowToast(true);
    } else {
      setErrorToast(true);
    }
  };

  if (loading) return <CircularProgress sx={{ mx: "auto", mt: 10, display: "block" }} />;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={4}>
              <Typography variant="h4">Edit Quiz</Typography>
              <TextField label="Quiz Title" {...register("quizTitle")} fullWidth />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Total Marks" type="number" {...register("totalMarks")} fullWidth />
                <TextField label="Duration (mins)" type="number" {...register("duration")} fullWidth />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <DateTimePicker
                  label="Start Date & Time"
                  value={dayjs(watch("startDateTime"))}
                  onChange={(val) => setValue("startDateTime", val?.toDate() || new Date())}
                />
                <DateTimePicker
                  label="End Date & Time"
                  value={dayjs(watch("expiryDateTime"))}
                  onChange={(val) => setValue("expiryDateTime", val?.toDate() || new Date())}
                />
              </Stack>
              <TextField label="Max Attempts" type="number" {...register("maxAttempts")} fullWidth />
              <FormControlLabel control={<Checkbox {...register("previewMode")} />} label="Enable Preview Mode" />
              <Stack direction="row" spacing={2}>
                <FormControlLabel control={<Checkbox {...register("shuffleQuestions")} />} label="Shuffle Questions" />
                <FormControlLabel control={<Checkbox {...register("shuffleOptions")} />} label="Shuffle Options" />
              </Stack>
              <Divider />
              <Typography variant="h6">Questions</Typography>
              {fields.map((q, i) => {
                const opts = watch(`questions.${i}.options`);
                return (
                  <Paper key={q.id} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Stack spacing={2}>
                      <TextField label="Question" {...register(`questions.${i}.question`)} fullWidth />
                      {opts.map((_, j) => (
                        <Stack key={j} direction="row" spacing={2} alignItems="center">
                          <TextField
                            label={`Option ${j + 1}`}
                            {...register(`questions.${i}.options.${j}.text`)}
                            fullWidth
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={opts[j].isCorrect || false}
                                onChange={(e) => {
                                  const updated = opts.map((opt: any, index: number) =>
                                    index === j ? { ...opt, isCorrect: e.target.checked } : opt
                                  );
                                  setValue(`questions.${i}.options`, updated);
                                }}
                              />
                            }
                            label="Correct"
                          />
                        </Stack>
                      ))}
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setValue(`questions.${i}.options`, [
                            ...opts,
                            { text: "", image: null, isCorrect: false },
                          ])
                        }
                      >
                        + Add Option
                      </Button>
                      <TextField
                        label="Explanation"
                        {...register(`questions.${i}.explanation`)}
                        fullWidth
                        multiline
                      />
                      <IconButton color="error" onClick={() => remove(i)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Paper>
                );
              })}
              <Button
                variant="outlined"
                onClick={() =>
                  append({
                    question: "",
                    image: null,
                    explanation: "",
                    options: [
                      { text: "", image: null, isCorrect: false },
                      { text: "", image: null, isCorrect: false },
                    ],
                  })
                }
              >
                + Add Question
              </Button>
              <Button type="submit" variant="contained" size="large">
                Save Changes
              </Button>
            </Stack>
          </form>
        </FormProvider>
        <Snackbar open={showToast} autoHideDuration={3000} onClose={() => setShowToast(false)}>
          <Alert severity="success" onClose={() => setShowToast(false)}>
            Quiz updated successfully!
          </Alert>
        </Snackbar>
        <Snackbar open={errorToast} autoHideDuration={3000} onClose={() => setErrorToast(false)}>
          <Alert severity="error" onClose={() => setErrorToast(false)}>
            Failed to update quiz.
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}
