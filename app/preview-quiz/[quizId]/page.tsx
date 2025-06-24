'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabaseClient';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Option {
  text: string;
  image: string | null;
  isCorrect: boolean;
}

interface Question {
  id: number;
  question_text: string;
  options: Option[] | string;
  correct_answers: string[] | string;
  explanation: string | null;
}

interface Quiz {
  id: number;
  title: string;
}

export default function PreviewQuizPage() {
  const params = useParams();
  const quizId = Array.isArray(params?.quizId) ? params.quizId[0] : params?.quizId;
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId) return;

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      const { data: rawQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId);

      const parsedQuestions = (rawQuestions || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answers:
          typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers,
      }));

      setQuiz(quizData);
      setQuestions(parsedQuestions);
      setLoading(false);
    };

    fetchData();
  }, [quizId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6">Quiz not found.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: '1000px',
        mx: 'auto',
        background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
        minHeight: '100vh',
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3, fontWeight: 600, borderRadius: 2 }}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </Button>
      <Typography variant="h3" fontWeight="bold" gutterBottom>
        Preview Quiz: {quiz.title}
      </Typography>

      {questions.map((q, index) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.15 }}
        >
          <Paper
            elevation={6}
            sx={{
              mb: 4,
              p: 3,
              borderRadius: 3,
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              },
            }}
          >
            <Typography variant="h6" fontWeight="bold" mb={1}>
              Q{index + 1}. {q.question_text}
            </Typography>

            {Array.isArray(q.options) &&
              q.options.map((opt, i) => {
                const isCorrect =
                  Array.isArray(q.correct_answers) && q.correct_answers.includes(opt.text);
                return (
                  <Box key={i} display="flex" alignItems="center" mb={0.75}>
                    <Typography
                      variant="body1"
                      sx={{ mr: 1, fontWeight: 'bold', color: '#64748b' }}
                    >
                      {String.fromCharCode(65 + i)}.
                    </Typography>
                    <Typography
                      variant="body1"
                      color={isCorrect ? 'success.main' : 'text.primary'}
                      fontWeight={isCorrect ? 'bold' : 'normal'}
                    >
                      {opt.text}
                    </Typography>
                    {isCorrect && (
                      <Chip
                        label="Correct"
                        size="small"
                        color="success"
                        sx={{ ml: 1, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                );
              })}

            {q.correct_answers && (
              <Box mt={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Correct Answer
                  {Array.isArray(q.correct_answers) && q.correct_answers.length > 1 ? 's' : ''}:{' '}
                  {Array.isArray(q.correct_answers)
                    ? q.correct_answers.join(', ')
                    : q.correct_answers}
                </Typography>
              </Box>
            )}

            {q.explanation && (
              <Box mt={1}>
                <Typography variant="body2" color="text.secondary">
                  Explanation: {q.explanation}
                </Typography>
              </Box>
            )}
          </Paper>
        </motion.div>
      ))}
    </Box>
  );
}
