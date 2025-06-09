'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import { supabase } from '@/utils/supabaseClient';

export default function AttemptQuizPage() {
  const params = useParams();
const quizId = Array.isArray(params?.quizId) ? params.quizId[0] : params?.quizId;
  const router = useRouter();

  const [quiz, setQuiz] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Disable copy/paste & text selection
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v')) e.preventDefault();
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventCopy);
    document.addEventListener('keydown', preventKey);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventCopy);
      document.removeEventListener('keydown', preventKey);
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) {
        console.error('Error fetching quiz:', error.message);
        router.push('/dashboard/student');
        return;
      }

      setQuiz(data);
      const durationMinutes = data.duration || 30;
      setTimeLeft(durationMinutes * 60); // convert to seconds
      setLoading(false);
    };

    if (quizId) fetchQuiz();
  }, [quizId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Typography variant="h6" textAlign="center" mt={6}>
        Quiz not found.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        p: 4,
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">{quiz.title}</Typography>
        <Typography variant="h6" color="error">
          ⏳ {formatTime(timeLeft)}
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Typography>
            {/* Replace this with question list later */}
            Question content will go here...
          </Typography>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="flex-end" mt={4}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => alert('Submit clicked')}
        >
          Submit Quiz
        </Button>
      </Stack>
    </Box>
  );
}
