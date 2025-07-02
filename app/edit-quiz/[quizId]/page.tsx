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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  Chip,
  Tooltip
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const methods = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      quizTitle: "",
      description: "",
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
          let correctAnswers: string[] = [];
          try {
            if (typeof q.correct_answers === "string") {
              if (q.correct_answers.trim().startsWith("[")) {
                correctAnswers = JSON.parse(q.correct_answers);
              } else if (q.correct_answers.trim() !== "") {
                correctAnswers = [q.correct_answers.trim()];
              }
            } else if (Array.isArray(q.correct_answers)) {
              correctAnswers = q.correct_answers;
            }
          } catch {
            correctAnswers = [];
          }

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
            questionType: q.question_type || 'single',
            marks: q.marks ? String(q.marks) : '1',
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

        reset({
          quizTitle: quiz.quiz_title || quiz.quiz_name || "",
          description: quiz.description || "",
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
        description: data.description,
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
      setShowSuccessDialog(true);
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
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Edit Quiz</Typography>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Quiz Information</Typography>
                <Stack spacing={2}>
                  <TextField label="Quiz Title" {...register("quizTitle")} fullWidth helperText="Enter a descriptive title for your quiz." />
                  <TextField label="Description" {...register("description")} fullWidth multiline minRows={2} helperText="Describe the quiz for students (optional)." />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField label="Total Marks" type="number" {...register("totalMarks")} fullWidth helperText="Sum of all question marks." />
                    <TextField label="Duration (mins)" type="number" {...register("duration")} fullWidth helperText="How long students have to complete the quiz." />
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
                  <TextField label="Max Attempts" type="number" {...register("maxAttempts")} fullWidth helperText="How many times a student can attempt this quiz." />
                  <Stack direction="row" spacing={2}>
                    <FormControlLabel control={<Checkbox {...register("previewMode")} />} label="Enable Preview Mode" />
                    <FormControlLabel control={<Checkbox {...register("shuffleQuestions")} />} label="Shuffle Questions" />
                    <FormControlLabel control={<Checkbox {...register("shuffleOptions")} />} label="Shuffle Options" />
                  </Stack>
                </Stack>
              </Paper>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>Questions</Typography>
              <Stack spacing={2}>
                {fields.map((q, i) => {
                  const opts = watch(`questions.${i}.options`);
                  return (
                    <Accordion key={q.id} defaultExpanded={i === 0} sx={{ borderRadius: 2, boxShadow: 2, mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600} sx={{ color: 'text.primary' }}>{watch(`questions.${i}.question`) || `Question ${i + 1}`}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                            <Chip label={watch(`questions.${i}.questionType`) === 'multiple' ? 'Multiple' : 'Single'} color="info" size="small" />
                            <Chip label={`Marks: ${watch(`questions.${i}.marks`)}`} color="secondary" size="small" />
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Move Up"><span><IconButton disabled={i === 0} onClick={() => {
                            if (i > 0) {
                              const arr = [...fields];
                              const temp = arr[i - 1];
                              arr[i - 1] = arr[i];
                              arr[i] = temp;
                              reset({ ...methods.getValues(), questions: arr });
                            }
                          }}><ArrowUpwardIcon /></IconButton></span></Tooltip>
                          <Tooltip title="Move Down"><span><IconButton disabled={i === fields.length - 1} onClick={() => {
                            if (i < fields.length - 1) {
                              const arr = [...fields];
                              const temp = arr[i + 1];
                              arr[i + 1] = arr[i];
                              arr[i] = temp;
                              reset({ ...methods.getValues(), questions: arr });
                            }
                          }}><ArrowDownwardIcon /></IconButton></span></Tooltip>
                          <Tooltip title="Delete Question"><span><IconButton color="error" onClick={() => remove(i)}><DeleteIcon /></IconButton></span></Tooltip>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
                          <TextField label="Question" {...register(`questions.${i}.question`)} fullWidth required />
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <Select label="Type" value={watch(`questions.${i}.questionType`) as "single" | "multiple"} onChange={e => setValue(`questions.${i}.questionType`, e.target.value as "single" | "multiple")} fullWidth>
                              <MenuItem value="single">Single Correct</MenuItem>
                              <MenuItem value="multiple">Multiple Correct</MenuItem>
                            </Select>
                            <TextField label="Marks" type="number" {...register(`questions.${i}.marks`)} fullWidth required />
                          </Stack>
                          <TextField label="Explanation" {...register(`questions.${i}.explanation`)} fullWidth multiline minRows={2} />
                          <Typography variant="subtitle2" sx={{ mt: 1 }}>Options</Typography>
                          <Stack spacing={1}>
                            {opts.map((opt, j) => (
                              <Stack key={j} direction="row" spacing={2} alignItems="center" sx={{ bgcolor: opt.isCorrect ? 'success.light' : 'background.paper', borderRadius: 2, p: 1 }}>
                                <Chip label={String.fromCharCode(65 + j)} color={opt.isCorrect ? 'success' : 'default'} />
                                <TextField label={`Option ${j + 1}`} {...register(`questions.${i}.options.${j}.text`)} fullWidth required />
                                <Tooltip title={opt.isCorrect ? 'Correct Answer' : 'Mark as Correct'}>
                                  <Checkbox checked={opt.isCorrect || false} onChange={e => {
                                    const updated = opts.map((o, idx) => idx === j ? { ...o, isCorrect: e.target.checked } : (watch(`questions.${i}.questionType`) === 'single' ? { ...o, isCorrect: false } : o));
                                    updated[j].isCorrect = e.target.checked;
                                    setValue(`questions.${i}.options`, updated);
                                  }} color={opt.isCorrect ? 'success' : 'primary'} />
                                </Tooltip>
                                <Tooltip title="Delete Option"><span><IconButton color="error" onClick={() => setValue(`questions.${i}.options`, opts.filter((_, idx) => idx !== j))}><DeleteIcon /></IconButton></span></Tooltip>
                              </Stack>
                            ))}
                            <Button variant="outlined" onClick={() => setValue(`questions.${i}.options`, [...opts, { text: "", image: null, isCorrect: false }])} sx={{ mt: 1 }}>+ Add Option</Button>
                          </Stack>
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                <Button
                  variant="outlined"
                  onClick={() =>
                    append({
                      section: "Section 1",
                      question: "",
                      image: null,
                      explanation: "",
                      questionType: 'single',
                      marks: '1',
                      options: [
                        { text: "", image: null, isCorrect: false },
                        { text: "", image: null, isCorrect: false },
                      ],
                    })
                  }
                  sx={{ mt: 2 }}
                >
                  + Add Question
                </Button>
              </Stack>
              <Box sx={{ position: 'sticky', bottom: 0, zIndex: 10, bgcolor: 'background.paper', py: 2, mt: 4, boxShadow: 3, borderRadius: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" size="large" sx={{ px: 5, fontWeight: 700 }}>
                  Save Changes
                </Button>
              </Box>
            </Stack>
          </form>
        </FormProvider>
        <Snackbar open={showToast} autoHideDuration={3000} onClose={() => setShowToast(false)}>
          <Alert severity="success" onClose={() => setShowToast(false)}>
            All changes have been saved!
          </Alert>
        </Snackbar>
        <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)}>
          <DialogTitle>Quiz changes saved successfully!</DialogTitle>
          <DialogContent>
            <Typography>Your quiz has been updated and all changes are now live.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSuccessDialog(false)} variant="contained" color="primary">Close</Button>
          </DialogActions>
        </Dialog>
        <Snackbar open={errorToast} autoHideDuration={3000} onClose={() => setErrorToast(false)}>
          <Alert severity="error" onClose={() => setErrorToast(false)}>
            Failed to update quiz.
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}
