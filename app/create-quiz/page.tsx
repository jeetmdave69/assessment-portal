'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';
import { quizSchema, QuizFormValues } from '@/schemas/quizSchema';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateQuizPage() {
  const { mode, toggleMode } = useThemeMode();
  const { isLoaded, isSignedIn, user } = useUser();

  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      quizTitle: '',
      totalMarks: '0',
      duration: '0',
      startDateTime: dayjs().toDate(),
      expiryDateTime: dayjs().add(1, 'day').toDate(),
      shuffleQuestions: false,
      shuffleOptions: false,
      maxAttempts: '1',
      previewMode: false,
      questions: [
        {
          question: '',
          image: null,
          explanation: '',
          options: [
            { text: '', image: null, isCorrect: false },
            { text: '', image: null, isCorrect: false },
          ],
        },
      ],
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = methods;

  const { fields: questionFields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  useEffect(() => setMounted(true), []);

  const onSubmit = async (data: QuizFormValues, isDraft: boolean) => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      alert('Please sign in before creating a quiz.');
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedCode = uuidv4().split('-')[0];

      const payload = {
        quiz_name: data.quizTitle,
        total_marks: parseInt(data.totalMarks),
        duration: parseInt(data.duration),
        start_time: data.startDateTime.toISOString(),
        end_time: data.expiryDateTime.toISOString(),
        shuffle_questions: data.shuffleQuestions,
        shuffle_options: data.shuffleOptions,
        max_attempts: parseInt(data.maxAttempts),
        preview_mode: data.previewMode,
        access_code: generatedCode,
        is_draft: isDraft,
        score: 0,
        user_id: user.id,
        creator_id: user.id,
      };

      const { data: insertedQuiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([payload])
        .select('id')
        .single();

      if (quizError) throw quizError;

      const quizId = insertedQuiz.id;

      const questionsPayload = data.questions.map((q) => ({
        quiz_id: quizId,
        question_text: q.question,
        explanation: q.explanation,
        options: q.options,
        correct_answers: q.options.filter(opt => opt.isCorrect).map(opt => opt.text),
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsPayload);

      if (questionsError) throw questionsError;

      reset();

      if (isDraft) {
        setShowToast(true);
      } else {
        setAccessCode(generatedCode);
        setOpenDialog(true);
      }
    } catch (err) {
      console.error('Quiz save error:', err);
      alert('Failed to save quiz. Check console for more details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" fontWeight={700}>Create New Quiz</Typography>
            <Tooltip title="Toggle Dark Mode">
              <IconButton onClick={toggleMode}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
              <Stack spacing={3}>
                <TextField label="Quiz Title" {...register('quizTitle')} fullWidth required />
                <Stack direction="row" spacing={2}>
                  <TextField label="Total Marks" type="number" {...register('totalMarks')} fullWidth required />
                  <TextField label="Duration (mins)" type="number" {...register('duration')} fullWidth required />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <DateTimePicker
                    label="Start Date & Time"
                    value={dayjs(watch('startDateTime'))}
                    onChange={(val) => setValue('startDateTime', val?.toDate() || new Date())}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DateTimePicker
                    label="End Date & Time"
                    value={dayjs(watch('expiryDateTime'))}
                    onChange={(val) => setValue('expiryDateTime', val?.toDate() || new Date())}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Stack>
                <TextField label="Max Attempts" type="number" {...register('maxAttempts')} fullWidth required />
                <FormControlLabel control={<Checkbox {...register('previewMode')} />} label="Enable Preview Mode" />
                <Stack direction="row" spacing={2}>
                  <FormControlLabel control={<Checkbox {...register('shuffleQuestions')} />} label="Shuffle Questions" />
                  <FormControlLabel control={<Checkbox {...register('shuffleOptions')} />} label="Shuffle Options" />
                </Stack>
              </Stack>

              <Typography variant="h6" mt={4} mb={2}>Questions</Typography>

              {questionFields.map((q, qIndex) => {
                const options = watch(`questions.${qIndex}.options`);
                return (
                  <Box key={q.id} mb={3} p={2} border={1} borderColor="grey.300" borderRadius={2}>
                    <Stack spacing={2}>
                      <TextField label="Question" {...register(`questions.${qIndex}.question`)} fullWidth required />
                      {options.map((_, optIndex) => (
                        <Stack key={optIndex} direction="row" spacing={2} alignItems="center">
                          <TextField
                            label={`Option ${optIndex + 1}`}
                            {...register(`questions.${qIndex}.options.${optIndex}.text`)}
                            fullWidth
                          />
                          <FormControlLabel
                            control={<Checkbox {...register(`questions.${qIndex}.options.${optIndex}.isCorrect`)} />}
                            label="Correct"
                          />
                        </Stack>
                      ))}
                      <Button
                        onClick={() =>
                          setValue(`questions.${qIndex}.options`, [
                            ...options,
                            { text: '', image: null, isCorrect: false },
                          ])
                        }
                        startIcon={<AddIcon />}
                      >
                        Add Option
                      </Button>
                      <TextField
                        label="Explanation"
                        {...register(`questions.${qIndex}.explanation`)}
                        fullWidth
                        multiline
                      />
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => remove(qIndex)}
                        color="error"
                      >
                        Remove Question
                      </Button>
                    </Stack>
                  </Box>
                );
              })}

              <Button
                startIcon={<AddIcon />}
                onClick={() =>
                  append({
                    question: '',
                    image: null,
                    explanation: '',
                    options: [
                      { text: '', image: null, isCorrect: false },
                      { text: '', image: null, isCorrect: false },
                    ],
                  })
                }
                sx={{ mt: 2 }}
              >
                Add Question
              </Button>

              <Stack direction="row" spacing={2} mt={4} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleSubmit((data) => onSubmit(data, true))}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Save as Draft'}
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={24} /> : 'Publish Quiz'}
                </Button>
              </Stack>
            </form>
          </FormProvider>
        </Paper>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Quiz Created Successfully!</DialogTitle>
          <DialogContent>
            <Typography>Share this access code with your students:</Typography>
            <Typography variant="h5" sx={{ mt: 2 }} color="primary" fontWeight="bold">
              {accessCode}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={showToast} autoHideDuration={3000} onClose={() => setShowToast(false)}>
          <Alert onClose={() => setShowToast(false)} severity="success" sx={{ width: '100%' }}>
            Quiz saved as draft!
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}
