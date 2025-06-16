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
import { useRouter } from 'next/navigation';
import { quizSchema, QuizFormValues } from '@/schemas/quizSchema';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useThemeMode } from '@/providers/ThemeModeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadImageToSupabase(file: File, pathPrefix: string) {
  const fileName = `${pathPrefix}/${uuidv4()}-${file.name}`;
  const { error } = await supabase.storage.from('quiz-option-images').upload(fileName, file);
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from('quiz-option-images').getPublicUrl(fileName);
  return publicUrlData.publicUrl;
}

export default function CreateQuizPage() {
  const { mode, toggleMode } = useThemeMode();
  const { isLoaded, isSignedIn, user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });

  const router = useRouter();

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
    formState: { errors },
  } = methods;

  const { fields: questionFields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  useEffect(() => setMounted(true), []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ open: true, msg, type });
  };

  // CSV upload to parse questions with multiple correct answers
const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      try {
        const parsedData = result.data as any[];

        const parsedQuestions = parsedData.map((row) => {
          const correctAnswers = (row.correct_answers || '')
            .split(';')
            .map((str: string) => str.trim());

          return {
            question: row.question || '',
            explanation: row.explanation || '',
            image: null,
            options: [1, 2, 3, 4].map((i) => {
              const optionText = row[`option${i}`] || '';
              return {
                text: optionText,
                image: null,
                isCorrect: correctAnswers.includes(optionText),
              };
            }),
          };
        });

        setValue('questions', parsedQuestions);
        showToast('CSV uploaded and parsed successfully!', 'success');
      } catch {
        showToast('Error parsing CSV. Please check the CSV format.', 'error');
      }
    },
    error: () => {
      showToast('Failed to read CSV file.', 'error');
    },
  });
};


  const onSubmit = async (data: QuizFormValues, isDraft: boolean) => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      showToast('Please sign in before creating a quiz.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedCode = uuidv4().split('-')[0];

      const { data: insertedQuiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([
          {
            quiz_title: data.quizTitle,
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
          },
        ])
        .select('id')
        .single();

      if (quizError) throw quizError;
      const quizId = insertedQuiz.id;

      const questionsPayload = data.questions.map((q) => ({
        quiz_id: quizId,
        quiz_title: data.quizTitle, 
        question_text: q.question,
        explanation: q.explanation,
        options: JSON.stringify(
          q.options.map((opt) => ({
            text: opt.text,
            image: opt.image || null,
            isCorrect: opt.isCorrect,
          }))
        ),
        correct_answers: JSON.stringify(q.options.filter((opt) => opt.isCorrect).map((opt) => opt.text)),
      }));

      const { error: questionsError } = await supabase.from('questions').insert(questionsPayload);
      if (questionsError) throw questionsError;

      reset();
      if (isDraft) {
        showToast('Quiz saved as draft!', 'success');
      } else {
        setAccessCode(generatedCode);
        setOpenDialog(true);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to save quiz.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  // Render options for a question including image upload and correct checkbox
  const renderOptions = (qIndex: number, options: any[]) =>
    options.map((opt: any, optIndex: number) => {
      const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const imageUrl = await uploadImageToSupabase(file, `quiz-options`);
          setValue(`questions.${qIndex}.options.${optIndex}.image`, imageUrl);
          showToast('Image uploaded!', 'success');
        } catch {
          showToast('Image upload failed', 'error');
        }
      };

      return (
        <Stack
          key={optIndex}
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <TextField
            label={`Option ${optIndex + 1}`}
            {...register(`questions.${qIndex}.options.${optIndex}.text` as const)}
            fullWidth
          />
          <Button variant="outlined" component="label" size="small">
            Upload Image
            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
          </Button>
          {opt.image && (
            <Box
              component="img"
              src={opt.image}
              alt={`Option ${optIndex + 1}`}
              sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={watch(`questions.${qIndex}.options.${optIndex}.isCorrect`)}
                onChange={(e) =>
                  setValue(`questions.${qIndex}.options.${optIndex}.isCorrect`, e.target.checked)
                }
              />
            }
            label="Correct"
          />
        </Stack>
      );
    });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h4" fontWeight={700}>
              Create New Quiz
            </Typography>
            <Tooltip title="Toggle Theme">
              <IconButton onClick={toggleMode} aria-label="toggle theme">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Button
            variant="text"
            onClick={() => router.push('/dashboard')}
            sx={{ mb: 2 }}
          >
            ← Back to Dashboard
          </Button>

          <Divider sx={{ mb: 3 }} />

          {/* CSV Upload Button */}
          <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Button variant="outlined" component="label">
              Upload Questions via CSV
              <input type="file" hidden accept=".csv" onChange={handleCsvUpload} />
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              (Optional) Upload CSV file to auto-fill questions. Use comma-separated numbers in
              {' '}
              <code>correct_option</code> for multiple answers (e.g. "1,3").
            </Typography>
          </Stack>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
              <Stack spacing={3}>
                <TextField
  label="Quiz Title"
  {...register('quizTitle', { required: 'Quiz Title is required' })}
  fullWidth
  required
  error={!!errors.quizTitle}
  helperText={errors.quizTitle?.message}
/>

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Total Marks"
                    type="number"
                    {...register('totalMarks')}
                    fullWidth
                    error={!!errors.totalMarks}
                    helperText={errors.totalMarks?.message}
                  />
                  <TextField
                    label="Duration (mins)"
                    type="number"
                    {...register('duration')}
                    fullWidth
                    error={!!errors.duration}
                    helperText={errors.duration?.message}
                  />
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
                <TextField
                  label="Max Attempts"
                  type="number"
                  {...register('maxAttempts')}
                  fullWidth
                  error={!!errors.maxAttempts}
                  helperText={errors.maxAttempts?.message}
                />
                <FormControlLabel
                  control={<Checkbox {...register('previewMode')} />}
                  label="Enable Preview Mode"
                />
                <Stack direction="row" spacing={2}>
                  <FormControlLabel
                    control={<Checkbox {...register('shuffleQuestions')} />}
                    label="Shuffle Questions"
                  />
                  <FormControlLabel
                    control={<Checkbox {...register('shuffleOptions')} />}
                    label="Shuffle Options"
                  />
                </Stack>
              </Stack>

              <Typography variant="h6" mt={4} mb={2}>
                Questions
              </Typography>

              {questionFields.map((q, qIndex) => {
                const options = watch(`questions.${qIndex}.options`);
                return (
                  <Box
                    key={q.id}
                    mb={3}
                    p={2}
                    border={1}
                    borderColor="grey.300"
                    borderRadius={2}
                    role="region"
                    aria-label={`Question ${qIndex + 1}`}
                  >
                    <Stack spacing={2}>
                      {/* Question with image upload */}
                      <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                        <TextField
                          label="Question"
                          {...register(`questions.${qIndex}.question`)}
                          fullWidth
                          required
                          error={!!errors.questions?.[qIndex]?.question}
                          helperText={errors.questions?.[qIndex]?.question?.message}
                        />
                        <Button variant="outlined" component="label" size="small">
                          Upload Image
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const imageUrl = await uploadImageToSupabase(
                                  file,
                                  'quiz-questions'
                                );
                                setValue(`questions.${qIndex}.image`, imageUrl);
                                showToast('Question image uploaded!', 'success');
                              } catch {
                                showToast('Image upload failed', 'error');
                              }
                            }}
                          />
                        </Button>
                      </Stack>
                      
                      {/* Question image preview */}
                      {watch(`questions.${qIndex}.image`) && (
                        <Box
                          component="img"
                          src={watch(`questions.${qIndex}.image`)}
                          alt={`Question ${qIndex + 1} image`}
                          sx={{ 
                            maxWidth: 200, 
                            maxHeight: 200, 
                            objectFit: 'contain', 
                            borderRadius: 1 
                          }}
                        />
                      )}

                      {/* Options */}
                      {renderOptions(qIndex, options)}
                      
                      <Button
                        onClick={() =>
                          setValue(`questions.${qIndex}.options`, [
                            ...options,
                            { text: '', image: null, isCorrect: false },
                          ])
                        }
                        startIcon={<AddIcon />}
                        size="small"
                      >
                        Add Option
                      </Button>
                      
                      <TextField
                        label="Explanation"
                        {...register(`questions.${qIndex}.explanation`)}
                        fullWidth
                        multiline
                        rows={2}
                        error={!!errors.questions?.[qIndex]?.explanation}
                        helperText={errors.questions?.[qIndex]?.explanation?.message}
                      />
                      
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => remove(qIndex)}
                        color="error"
                        size="small"
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

              <Stack
                direction="row"
                spacing={2}
                mt={4}
                justifyContent="flex-end"
              >
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

        {/* Success Dialog */}
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

        {/* Toast Notifications */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={toast.type}
            sx={{ width: '100%' }}
            onClose={() => setToast({ ...toast, open: false })}
          >
            {toast.msg}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}