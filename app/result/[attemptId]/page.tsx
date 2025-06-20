'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
  Chip,
  Stack,
  Divider,
  Paper,
  Alert,
} from '@mui/material';
import { supabase } from '@/utils/supabaseClient';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const PASS_THRESHOLD = 60;

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();

  const attemptId = Number(Array.isArray(params?.attemptId) ? params.attemptId[0] : params?.attemptId);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [showBackWarning, setShowBackWarning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!attemptId || isNaN(attemptId)) return;

      const { data: attemptData } = await supabase
        .from('attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (!attemptData) {
        setLoading(false);
        return;
      }

      if (!attemptData.completed_at) {
        const now = new Date().toISOString();
        await supabase.from('attempts').update({ completed_at: now }).eq('id', attemptId);
        attemptData.completed_at = now;
      }

      const { data: quiz } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', attemptData.quiz_id)
        .single();

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', attemptData.quiz_id);

      const parsedQuestions = (questionData || []).map((q: any) => {
        // Check if options is already an object, if not parse it
        const options = typeof q.options === 'string' ? JSON.parse(q.options || '[]') : q.options || [];
        // Check if correct_answers is already an object, if not parse it
        const correct = typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers || '[]') : q.correct_answers || [];

        return {
          id: q.id,
          question_text: q.question_text,
          explanation: q.explanation || '',
          options: options.map((opt: any) => {
            const text = typeof opt === 'string' ? opt : opt?.text || '';
            const isCorrect = correct.some(
              (c: any) =>
                (typeof c === 'string' ? c.trim() : c?.text?.trim()) === text.trim()
            );
            return { text, isCorrect };
          }),
        };
      });

      setQuizTitle(quiz?.quiz_title || 'Untitled Quiz');
      setAttempt({
        ...attemptData,
        answers: typeof attemptData.answers === 'string' ? JSON.parse(attemptData.answers || '{}') : attemptData.answers || {},
        correct_answers: typeof attemptData.correct_answers === 'string' ? JSON.parse(attemptData.correct_answers || '{}') : attemptData.correct_answers || {},
      });
      setQuestions(parsedQuestions);
      setLoading(false);
    };

    fetchData();
  }, [attemptId]);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      setShowBackWarning(true);
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const normalize = (val: any) =>
    typeof val === 'string'
      ? val.trim().toLowerCase()
      : val?.text?.trim().toLowerCase() || '';

  if (loading) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!attempt) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <Typography variant="h6">Attempt not found</Typography>
      </Box>
    );
  }

  const total = questions.length;
  const score = attempt?.score ?? 0;
  const isPassed = total > 0 && (score / total) * 100 >= PASS_THRESHOLD;

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
      <Box sx={{ minHeight: '100vh', background: '#f4f6f8', py: 4 }}>
        <Container maxWidth="md">
          {showBackWarning && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              ⚠️ You cannot go back to the quiz page after submission.
            </Alert>
          )}

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Quiz Result Summary
          </Typography>

          <Typography variant="h6" gutterBottom>
            <strong>Quiz:</strong> {quizTitle}
          </Typography>
          <Typography variant="h6" gutterBottom>
            <strong>Candidate:</strong> {attempt?.user_name ?? 'Unknown'}
          </Typography>

          <Typography variant="h6" gutterBottom>
            <strong>Score:</strong> {score} / {total}
          </Typography>
          <Typography
            variant="h6"
            color={isPassed ? '#388e3c' : '#d32f2f'}
            fontWeight="bold"
            gutterBottom
          >
            <strong>Result:</strong> {isPassed ? 'Pass' : 'Fail'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {questions.map((q, idx) => {
            const userAns = attempt.answers?.[q.id] ?? [];
            const userAnswers = Array.isArray(userAns) ? userAns.map(normalize) : [normalize(userAns)];

            const correctAns = attempt.correct_answers?.[q.id] ?? [];
            const correctAnswers = Array.isArray(correctAns)
              ? correctAns.map(normalize)
              : [normalize(correctAns)];

            const isCorrect =
              userAnswers.length === correctAnswers.length &&
              userAnswers.every((ans) => correctAnswers.includes(ans));

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
              >
                <Card
                  sx={{
                    my: 2,
                    backgroundColor: isCorrect ? '#e8f5e9' : '#ffebee',
                    borderLeft: `6px solid ${isCorrect ? '#388e3c' : '#d32f2f'}`,
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Q{idx + 1}. {q.question_text}
                      </Typography>
                      <Chip
                        label={isCorrect ? 'Correct' : 'Incorrect'}
                        sx={{
                          backgroundColor: isCorrect ? '#388e3c' : '#d32f2f',
                          color: '#fff',
                          fontWeight: 'bold',
                        }}
                        icon={isCorrect ? <Check size={18} color="white" /> : <X size={18} color="white" />}
                      />
                    </Stack>

                    {q.options.map((opt: any, i: number) => {
                      const selected = userAnswers.includes(normalize(opt.text));
                      return (
                        <Paper
                          key={i}
                          sx={{
                            p: 1.5,
                            my: 0.5,
                            backgroundColor: selected
                              ? opt.isCorrect
                                ? '#c8e6c9'
                                : '#ffcdd2'
                              : opt.isCorrect
                              ? '#bbdefb'
                              : '#fafafa',
                            border: '1px solid',
                            borderColor: selected
                              ? opt.isCorrect
                                ? '#388e3c'
                                : '#d32f2f'
                              : opt.isCorrect
                              ? '#1976d2'
                              : '#e0e0e0',
                            borderRadius: 1,
                          }}
                        >
                          <Typography>{opt.text}</Typography>
                        </Paper>
                      );
                    })}

                    {q.explanation && (
                      <Typography variant="body2" mt={1.5} fontStyle="italic" color="text.secondary">
                        Explanation: {q.explanation}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          <Box mt={4} display="flex" justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 'bold', textTransform: 'none' }}
              onClick={() => router.push('/')}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Container>
      </Box>
    </motion.div>
  );
}