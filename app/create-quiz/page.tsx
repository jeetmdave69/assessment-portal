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
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  Select,
  SelectChangeEvent,
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
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useThemeMode } from '@/providers/ThemeModeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import dayjs from 'dayjs';
import Papa from 'papaparse';

interface QuizOption {
  text: string;
  image?: string | null;
  isCorrect: boolean;
}

interface QuizQuestion {
  question: string;
  questionType: 'single' | 'multiple';
  image?: string | null;
  explanation?: string;
  marks: string;
  options: QuizOption[];
}

interface QuizResponse {
  id: string;
  access_code: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadImageToSupabase(file: File, pathPrefix: string): Promise<string> {
  const fileName = `${pathPrefix}/${uuidv4()}-${file.name}`;
  const { error } = await supabase.storage.from('quiz-option-images').upload(fileName, file);
  if (error) throw error;
  return supabase.storage.from('quiz-option-images').getPublicUrl(fileName).data.publicUrl;
}

const ModernDateTimePicker = ({ 
  label, 
  value, 
  onChange 
}: {
  label: string;
  value: Date;
  onChange: (date: Date | null) => void;
}) => (
  <DateTimePicker
    label={label}
    value={dayjs(value)}
    onChange={(newValue) => onChange(newValue?.toDate() || null)}
    slotProps={{
      textField: {
        fullWidth: true,
        variant: 'outlined',
        sx: { 
          '& .MuiInputBase-root': { height: '56px' },
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': { borderColor: 'primary.main' }
          }
        }
      },
      popper: {
        sx: {
          '& .MuiPaper-root': {
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
          }
        }
      }
    }}
  />
);

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
      description: '',
      totalMarks: '0',
      duration: '0',
      startDateTime: dayjs().toDate(),
      expiryDateTime: dayjs().add(1, 'day').toDate(),
      shuffleQuestions: false,
      shuffleOptions: false,
      maxAttempts: '1',
      previewMode: false,
      showCorrectAnswers: false,
      passingScore: '0',
      questions: [
        {
          question: '',
          questionType: 'single',
          image: null,
          explanation: '',
          marks: '1',
          options: [
            { text: '', image: null, isCorrect: false },
            { text: '', image: null, isCorrect: false },
          ],
        },
      ],
    },
  });

  const { control, register, handleSubmit, setValue, watch, reset, formState: { errors } } = methods;
  const { fields: questionFields, append, remove } = useFieldArray({ control, name: 'questions' });

  useEffect(() => setMounted(true), []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ open: true, msg, type });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const parsedQuestions: QuizQuestion[] = result.data.map((row: any) => {
            const correctAnswers = (row.correct_answers || '').split(';').map((s: string) => s.trim());
            const questionType = correctAnswers.length > 1 ? 'multiple' : 'single';

            const options = [1, 2, 3, 4]
              .map((i) => ({
                text: row[`option${i}`] || '',
                image: null,
                isCorrect: correctAnswers.includes((row[`option${i}`] || '').trim()),
              }))
              .filter(opt => opt.text);

            return {
              question: row.question || '',
              questionType,
              explanation: row.explanation || '',
              marks: row.marks || '1',
              image: null,
              options: options.length >= 2 ? options : [
                { text: '', image: null, isCorrect: false },
                { text: '', image: null, isCorrect: false },
              ]
            };
          });

          setValue('questions', parsedQuestions);
          showToast('CSV imported successfully!', 'success');
        } catch {
          showToast('Invalid CSV format', 'error');
        }
      },
      error: () => showToast('Failed to read CSV', 'error'),
    });
  };

  const onSubmit = async (data: QuizFormValues, isDraft: boolean) => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      showToast('Please sign in', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const accessCode = uuidv4().split('-')[0];
      
      // 1. First create the quiz entry
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          quiz_title: data.quizTitle,
          description: data.description,
          total_marks: parseInt(data.totalMarks) || data.questions.reduce((sum, q) => sum + parseInt(q.marks), 0),
          duration: parseInt(data.duration),
          start_time: data.startDateTime.toISOString(),
          end_time: data.expiryDateTime.toISOString(),
          shuffle_questions: data.shuffleQuestions,
          shuffle_options: data.shuffleOptions,
          max_attempts: parseInt(data.maxAttempts),
          preview_mode: data.previewMode,
          show_correct_answers: data.showCorrectAnswers,
          passing_score: parseInt(data.passingScore),
          access_code: accessCode,
          is_draft: isDraft,
          user_id: user.id,
        })
        .select('id, access_code')
        .single();

      if (quizError) throw quizError;
      if (!quiz) throw new Error('Failed to create quiz');

      // 2. Process all questions
      for (const q of data.questions) {
        // Upload question image if exists
        const questionImageUrl = q.image instanceof File 
          ? await uploadImageToSupabase(q.image, 'questions') 
          : q.image;

        // Process all option images in parallel
        const processedOptions = await Promise.all(
          q.options.map(async (opt) => ({
            text: opt.text,
            image: opt.image instanceof File 
              ? await uploadImageToSupabase(opt.image, 'options') 
              : opt.image,
            is_correct: opt.isCorrect,
          }))
        );

        // Prepare correct answers array (indices of correct options)
        const correctAnswers = processedOptions
          .map((opt, index) => opt.is_correct ? index : null)
          .filter(index => index !== null);

        // Insert question with all data
        const { error: questionError } = await supabase
          .from('questions')
          .insert({
            quiz_id: quiz.id,
            question_text: q.question,
            question_type: q.questionType,
            explanation: q.explanation,
            marks: parseInt(q.marks),
            image_url: questionImageUrl,
            options: processedOptions,
            correct_answers: correctAnswers,
            blank_answers: null,
            matching_pairs: null
          });

        if (questionError) throw questionError;
      }

      reset();
      if (!isDraft) {
        setAccessCode(quiz.access_code);
        setOpenDialog(true);
      }
      showToast(`Quiz ${isDraft ? 'saved as draft' : 'published'}!`, 'success');
    } catch (err: any) {
      console.error('Quiz submission error:', err);
      showToast(err.message || 'Error saving quiz', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOptions = (qIndex: number, options: QuizOption[], questionType: 'single' | 'multiple') => {
    const handleOptionChange = (optIndex: number, isCorrect: boolean) => {
      if (questionType === 'single') {
        options.forEach((_, idx) => {
          setValue(`questions.${qIndex}.options.${idx}.isCorrect`, idx === optIndex);
        });
      } else {
        setValue(`questions.${qIndex}.options.${optIndex}.isCorrect`, isCorrect);
      }
    };

    return options.map((opt, optIndex) => (
      <Stack key={optIndex} direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            questionType === 'single' ? (
              <Radio
                checked={opt.isCorrect}
                onChange={() => handleOptionChange(optIndex, true)}
                color="primary"
              />
            ) : (
              <Checkbox
                checked={opt.isCorrect}
                onChange={(e) => handleOptionChange(optIndex, e.target.checked)}
                color="primary"
              />
            )
          }
          label={
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={opt.text}
              onChange={(e) => setValue(`questions.${qIndex}.options.${optIndex}.text`, e.target.value)}
              sx={{ backgroundColor: 'background.paper', borderRadius: 1 }}
            />
          }
          sx={{ flex: 1, alignItems: 'center' }}
        />
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUploadIcon />}
          sx={{ minWidth: 120 }}
        >
          Image
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const url = await uploadImageToSupabase(file, 'options');
                  setValue(`questions.${qIndex}.options.${optIndex}.image`, url);
                } catch {
                  showToast('Image upload failed', 'error');
                }
              }
            }}
          />
        </Button>
        {opt.image && (
          <Box
            component="img"
            src={opt.image}
            alt="Option"
            sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, border: '1px solid #eee' }}
          />
        )}
      </Stack>
    ));
  };

  if (!mounted) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight={600} color="primary">
              Create New Quiz
            </Typography>
            <Tooltip title="Toggle theme">
              <IconButton onClick={toggleMode}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Button onClick={() => router.push('/dashboard')} sx={{ mb: 3 }}>
            ← Back to Dashboard
          </Button>

          <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Import Questions
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ textTransform: 'none' }}
              >
                Upload CSV
                <input type="file" hidden accept=".csv" onChange={handleCsvUpload} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                Format: question,option1,option2,option3,option4,correct_answers,explanation,marks
              </Typography>
            </Stack>
          </Box>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
              <Stack spacing={3}>
                <TextField
                  label="Quiz Title"
                  {...register('quizTitle')}
                  fullWidth
                  required
                  error={!!errors.quizTitle}
                  helperText={errors.quizTitle?.message}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="Description"
                  {...register('description')}
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                />

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Total Marks"
                    type="number"
                    {...register('totalMarks')}
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    label="Duration (minutes)"
                    type="number"
                    {...register('duration')}
                    fullWidth
                    variant="outlined"
                  />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <ModernDateTimePicker
                    label="Start Date & Time"
                    value={watch('startDateTime')}
                    onChange={(date) => setValue('startDateTime', date || new Date())}
                  />
                  <ModernDateTimePicker
                    label="End Date & Time"
                    value={watch('expiryDateTime')}
                    onChange={(date) => setValue('expiryDateTime', date || new Date())}
                  />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Max Attempts"
                    type="number"
                    {...register('maxAttempts')}
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    label="Passing Score (%)"
                    type="number"
                    {...register('passingScore')}
                    fullWidth
                    variant="outlined"
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Stack>

                <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                  <FormControlLabel control={<Checkbox {...register('shuffleQuestions')} />} label="Shuffle Questions" />
                  <FormControlLabel control={<Checkbox {...register('shuffleOptions')} />} label="Shuffle Options" />
                  <FormControlLabel control={<Checkbox {...register('previewMode')} />} label="Preview Mode" />
                  <FormControlLabel control={<Checkbox {...register('showCorrectAnswers')} />} label="Show Answers" />
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                  Questions
                </Typography>

                {questionFields.map((q, qIndex) => {
                  const questionType = watch(`questions.${qIndex}.questionType`);
                  const options = watch(`questions.${qIndex}.options`);

                  return (
                    <Paper
                      key={q.id}
                      elevation={2}
                      sx={{ p: 3, mb: 3, borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}
                    >
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <TextField
                            label={`Question ${qIndex + 1}`}
                            {...register(`questions.${qIndex}.question`)}
                            fullWidth
                            required
                            multiline
                            variant="outlined"
                          />
                          <TextField
                            label="Marks"
                            type="number"
                            {...register(`questions.${qIndex}.marks`)}
                            sx={{ width: 100 }}
                            variant="outlined"
                          />
                        </Stack>

                        <FormControl fullWidth size="small">
                          <InputLabel>Question Type</InputLabel>
                          <Select
                            value={questionType}
                            label="Question Type"
                            onChange={(e) => setValue(`questions.${qIndex}.questionType`, e.target.value as 'single' | 'multiple')}
                            variant="outlined"
                          >
                            <MenuItem value="single">Single Correct Answer</MenuItem>
                            <MenuItem value="multiple">Multiple Correct Answers</MenuItem>
                          </Select>
                        </FormControl>

                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUploadIcon />}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Upload Question Image
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const url = await uploadImageToSupabase(file, 'questions');
                                  setValue(`questions.${qIndex}.image`, url);
                                } catch {
                                  showToast('Image upload failed', 'error');
                                }
                              }
                            }}
                          />
                        </Button>

                        {watch(`questions.${qIndex}.image`) && (
                          <Box
                            component="img"
                            src={watch(`questions.${qIndex}.image`)}
                            alt="Question"
                            sx={{ maxWidth: 200, maxHeight: 200, objectFit: 'contain', borderRadius: 1 }}
                          />
                        )}

                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                          {questionType === 'single' ? 'Select one correct answer' : 'Select all correct answers'}
                        </Typography>

                        {renderOptions(qIndex, options, questionType)}

                        <Button
                          startIcon={<AddIcon />}
                          onClick={() =>
                            setValue(`questions.${qIndex}.options`, [...options, { text: '', image: null, isCorrect: false }])
                          }
                          variant="outlined"
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Add Option
                        </Button>

                        <TextField
                          label="Explanation (shown after answering)"
                          {...register(`questions.${qIndex}.explanation`)}
                          fullWidth
                          multiline
                          rows={2}
                          variant="outlined"
                        />

                        <Button
                          startIcon={<DeleteIcon />}
                          onClick={() => remove(qIndex)}
                          color="error"
                          variant="outlined"
                          sx={{ alignSelf: 'flex-end' }}
                        >
                          Remove Question
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}

                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    append({
                      question: '',
                      questionType: 'single',
                      image: null,
                      explanation: '',
                      marks: '1',
                      options: [
                        { text: '', image: null, isCorrect: false },
                        { text: '', image: null, isCorrect: false },
                      ],
                    })
                  }
                  variant="outlined"
                  sx={{ mt: 2 }}
                >
                  Add Question
                </Button>

                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
                  <Button
                    variant="outlined"
                    onClick={handleSubmit((data) => onSubmit(data, true))}
                    disabled={isSubmitting}
                    sx={{ px: 4 }}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : 'Save Draft'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{ px: 4 }}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : 'Publish Quiz'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </FormProvider>
        </Paper>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Quiz Created Successfully!</DialogTitle>
          <DialogContent>
            <Typography>Share this access code with your students:</Typography>
            <Typography variant="h4" sx={{ mt: 2, mb: 1 }} color="primary" fontWeight="bold">
              {accessCode}
            </Typography>
            <Typography variant="body2">
              You can manage this quiz from your dashboard.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={toast.type}
            onClose={() => setToast({ ...toast, open: false })}
            sx={{ width: '100%' }}
          >
            {toast.msg}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}