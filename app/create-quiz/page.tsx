'use client';

import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  Typography,
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';
import { quizSchema, QuizFormValues } from '@/schemas/quizSchema';
import QuizDetailsForm from '@/components/quiz/QuizDetailsForm';
import QuestionList from '@/components/quiz/QuestionList';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

export default function CreateQuizPage() {
  const { mode, toggleMode } = useThemeMode();
  const { isLoaded, isSignedIn, user } = useUser();

  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [mounted, setMounted] = useState(false);

  const methods = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      quizTitle: '',
      totalMarks: '0',
      duration: '0',
      startDateTime: new Date(),
      expiryDateTime: new Date(),
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
            { text: '', image: null, isCorrect: false },
            { text: '', image: null, isCorrect: false },
          ],
        },
      ],
    },
  });

  useEffect(() => {
    setMounted(true);
    methods.reset({
      ...methods.getValues(),
      startDateTime: dayjs().toDate(),
      expiryDateTime: dayjs().add(1, 'day').toDate(),
    });
  }, []);

  const handleSubmit = async (data: QuizFormValues, isDraft: boolean) => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      alert('User not loaded or not signed in. Please sign in first.');
      return;
    }

    try {
      const generatedCode = uuidv4().split('-')[0];

      const payload = {
        user_id: user.id,
        quiz_name: data.quizTitle,
        total_marks: parseInt(data.totalMarks),
        duration: parseInt(data.duration),
        start_time: data.startDateTime.toISOString(),
        end_time: data.expiryDateTime.toISOString(),
        shuffle_questions: data.shuffleQuestions,
        shuffle_options: data.shuffleOptions,
        max_attempts: parseInt(data.maxAttempts),
        preview_mode: data.previewMode,
        questions: data.questions,
        access_code: generatedCode,
        is_draft: isDraft,
        score: 0,
        creator_id: user.id,
      };

      const { error } = await supabase.from('quizzes').insert([payload]);
      if (error) throw error;

      if (!isDraft) {
        setAccessCode(generatedCode);
        setOpenDialog(true);
      } else {
        setShowToast(true);
      }
    } catch (err) {
      alert('Failed to save quiz.');
      console.error(err);
    }
  };

  if (!mounted) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header with Dark Mode Toggle */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" fontWeight={700}>
              Create New Quiz
            </Typography>
            <Tooltip title="Toggle Dark Mode">
              <IconButton onClick={toggleMode} color="inherit">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit((data) => handleSubmit(data, false))}>
              <QuizDetailsForm />
              <QuestionList />

              <Stack direction="row" spacing={2} mt={4} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={methods.handleSubmit((data) => handleSubmit(data, true))}
                >
                  Save as Draft
                </Button>
                <Button type="submit" variant="contained">
                  Publish Quiz
                </Button>
              </Stack>
            </form>
          </FormProvider>
        </Paper>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Quiz Created Successfully!</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Share this access code with your students:
            </Typography>
            <Typography
              variant="h5"
              color="primary"
              sx={{ mt: 2, fontWeight: 'bold' }}
            >
              {accessCode}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={showToast}
          autoHideDuration={3000}
          onClose={() => setShowToast(false)}
        >
          <Alert onClose={() => setShowToast(false)} severity="success" sx={{ width: '100%' }}>
            Quiz saved as draft!
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}
