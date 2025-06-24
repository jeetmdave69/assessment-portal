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
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

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
  const [redirecting, setRedirecting] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(true);

  // Fetch attempt and quiz summary first
  useEffect(() => {
    const fetchSummary = async () => {
      if (!attemptId || isNaN(attemptId)) return;
      setLoading(true);
      const { data: attemptData } = await supabase
        .from('attempts')
        .select('id,quiz_id,user_name,score,correct_answers,answers')
        .eq('id', attemptId)
        .single();
      if (!attemptData) {
        setLoading(false);
        return;
      }
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('quiz_title')
        .eq('id', attemptData.quiz_id)
        .single();
      setQuizTitle(quiz?.quiz_title || 'Untitled Quiz');
      setAttempt({
        ...attemptData,
        answers: typeof attemptData.answers === 'string' ? JSON.parse(attemptData.answers || '{}') : attemptData.answers || {},
        correct_answers: typeof attemptData.correct_answers === 'string' ? JSON.parse(attemptData.correct_answers || '{}') : attemptData.correct_answers || {},
      });
      setLoading(false);
    };
    fetchSummary();
  }, [attemptId]);

  // Fetch questions for review in background
  useEffect(() => {
    if (!attempt || !attempt.quiz_id) return;
    setReviewLoading(true);
    const fetchQuestions = async () => {
      const { data: questionData } = await supabase
        .from('questions')
        .select('id,question_text,options,correct_answers,explanation')
        .eq('quiz_id', attempt.quiz_id);
      const parsedQuestions = (questionData || []).map((q: any) => {
        const options = typeof q.options === 'string' ? JSON.parse(q.options || '[]') : q.options || [];
        const correct = typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers || '[]') : q.correct_answers || [];
        return {
          id: q.id,
          question_text: q.question_text,
          explanation: q.explanation || '',
          options: options.map((opt: any) => {
            const text = typeof opt === 'string' ? opt : opt?.text || '';
            const isCorrect = correct.some(
              (c: any) => (typeof c === 'string' ? c.trim() : c?.text?.trim()) === text.trim()
            );
            return { text, isCorrect };
          }),
        };
      });
      setQuestions(parsedQuestions);
      setReviewLoading(false);
    };
    fetchQuestions();
  }, [attempt]);

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

  if (loading || redirecting) {
    return (
      <Box height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <CelebrationIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, animation: 'spin 2s linear infinite' }} />
        <Typography variant="h5" fontWeight={700} color="primary" mb={2}>
          {redirecting ? 'Redirecting to dashboard...' : 'Preparing your result...'}
        </Typography>
        <CircularProgress size={48} thickness={4} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
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

  // Show summary instantly
  const total = Object.keys(attempt.correct_answers || {}).length;
  const score = attempt?.score ?? 0;
  const isPassed = total > 0 && (score / total) * 100 >= PASS_THRESHOLD;

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4f6f8 0%, #e3eafc 100%)', py: 4 }}>
        <Container maxWidth="md">
          {showBackWarning && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              ⚠️ You cannot go back to the quiz page after submission.
            </Alert>
          )}

          {/* Summary Card */}
          <Paper elevation={4} sx={{ p: 4, borderRadius: 4, mb: 4, boxShadow: 4, background: isPassed ? 'linear-gradient(90deg, #e0f7fa 0%, #b2dfdb 100%)' : 'linear-gradient(90deg, #ffebee 0%, #ffcdd2 100%)' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2}>
                {isPassed ? <EmojiEventsIcon sx={{ fontSize: 48, color: 'success.main' }} /> : <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />}
                <Box>
                  <Typography variant="h4" fontWeight={700} color={isPassed ? 'success.main' : 'error.main'}>
                    {isPassed ? 'Congratulations!' : 'Better Luck Next Time'}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {isPassed ? 'You passed the quiz.' : 'You did not pass the quiz.'}
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={1} alignItems="flex-end">
                <Chip label={isPassed ? 'PASS' : 'FAIL'} color={isPassed ? 'success' : 'error'} sx={{ fontWeight: 700, fontSize: 18, px: 2, py: 1, mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>
                  Score: <Box component="span" color={isPassed ? 'success.main' : 'error.main'}>{score}</Box> / {total}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Candidate: <strong>{attempt?.user_name ?? 'Unknown'}</strong>
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Quiz: <strong>{quizTitle}</strong>
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Questions Review - load lazily */}
          <Typography variant="h5" fontWeight={700} mb={2} color="primary.main">
            Review Your Answers
          </Typography>
          {reviewLoading ? (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading detailed review...</Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {questions.map((q, idx) => {
                const userAns = attempt.answers?.[q.id] ?? [];
                const userAnswers = Array.isArray(userAns) ? userAns.map(normalize) : [normalize(userAns)];
                const correctAns = attempt.correct_answers?.[q.id] ?? [];
                const correctAnswers = Array.isArray(correctAns) ? correctAns.map(normalize) : [normalize(correctAns)];
                const isCorrect =
                  userAnswers.length === correctAnswers.length &&
                  userAnswers.every((ans) => correctAnswers.includes(ans));
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                  >
                    <Card
                      elevation={3}
                      sx={{
                        my: 1,
                        backgroundColor: isCorrect ? '#e8f5e9' : '#ffebee',
                        borderLeft: `6px solid ${isCorrect ? '#388e3c' : '#d32f2f'}`,
                        borderRadius: 2,
                        boxShadow: 3,
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Typography variant="h6" fontWeight={700} color={isCorrect ? 'success.main' : 'error.main'}>
                            Q{idx + 1}
                          </Typography>
                          <Typography variant="body1" fontWeight={600} color="text.primary">
                            {q.question_text}
                          </Typography>
                        </Stack>
                        <Stack spacing={1} mt={1}>
                          {q.options.map((opt: any, i: number) => {
                            const selected = userAnswers.includes(normalize(opt.text));
                            return (
                              <Paper
                                key={i}
                                variant="outlined"
                                sx={{
                                  p: 1.2,
                                  pl: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  background: selected ? (opt.isCorrect ? '#c8e6c9' : '#ffcdd2') : 'inherit',
                                  borderColor: opt.isCorrect ? 'success.main' : selected ? 'error.main' : 'divider',
                                }}
                              >
                                <Typography>
                                  {opt.text}
                                  {opt.isCorrect && (
                                    <Box component="span" ml={1} color="success.main" fontWeight="bold">
                                      ✓
                                    </Box>
                                  )}
                                  {selected && !opt.isCorrect && (
                                    <Box component="span" ml={1} color="error.main" fontWeight="bold">
                                      ✗
                                    </Box>
                                  )}
                                </Typography>
                              </Paper>
                            );
                          })}
                        </Stack>
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
            </Stack>
          )}

          <Box mt={6} display="flex" justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 'bold', textTransform: 'none', boxShadow: 3 }}
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