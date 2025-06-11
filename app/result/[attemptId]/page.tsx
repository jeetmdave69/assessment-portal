'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { supabase } from '@/utils/supabaseClient';

interface Attempt {
  id: number;
  quiz_id: number;
  answers: Record<string, string>;
  correct_answers: Record<string, string[]>;
  submitted_at: string;
}

interface Question {
  id: number;
  question_text: string;
  options: {
    text: string;
    image?: string;
    isCorrect?: boolean;
  }[];
  image_url?: string;
  explanation?: string;
}

export default function ResultPage() {
  const params = useParams() as { attemptId: string };
  const attemptId = params.attemptId;
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    if (!attemptId) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: attemptData, error: attemptError } = await supabase
        .from('attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attemptData) {
        console.error('Failed to fetch attempt:', attemptError?.message);
        router.push('/dashboard/student');
        return;
      }

      setAttempt(attemptData);

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', attemptData.quiz_id);

      if (questionError) {
        console.error('Error fetching questions:', questionError.message);
        return;
      }

      const parsedQuestions = (questionData || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      }));

      setQuestions(parsedQuestions);
      calculateScore(attemptData.answers, attemptData.correct_answers);
      setLoading(false);
    };

    fetchData();
  }, [attemptId]);

  const calculateScore = (
    answers: Record<string, string>,
    correctAnswersMap: Record<string, string[]>
  ) => {
    let total = 0;

    Object.entries(answers).forEach(([questionId, rawUserAnswer]) => {
      const userAnswer = rawUserAnswer.trim().toLowerCase();
      const correct = (correctAnswersMap?.[questionId] || []).map((ans) =>
        ans.trim().toLowerCase()
      );
      if (correct.includes(userAnswer)) total += 1;
    });

    setScore(total);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (!attempt) {
    return <Typography mt={4}>Attempt not found.</Typography>;
  }

  return (
    <Box
      sx={{
        p: 4,
        backgroundColor: '#121212',
        minHeight: '100vh',
        color: '#ffffff',
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom color="#fff">
        📝 Quiz Result
      </Typography>

      <Typography variant="subtitle1" gutterBottom color="#ccc">
        Submitted at: {new Date(attempt.submitted_at).toLocaleString()}
      </Typography>

      <Typography variant="h6" mt={2} color="#4caf50">
        ✅ Score: {score} / {questions.length}
      </Typography>

      <Divider sx={{ my: 3, borderColor: '#444' }} />

      {questions.map((q, index) => {
        const userAnswerRaw = attempt.answers[q.id.toString()];
        const userAnswer = userAnswerRaw?.trim().toLowerCase() || '';

        const correctNormalized = (attempt.correct_answers?.[q.id.toString()] || []).map(
          (ans) => ans.trim().toLowerCase()
        );

        const isCorrect = correctNormalized.includes(userAnswer);

        return (
          <Card
            key={q.id}
            sx={{
              mb: 3,
              backgroundColor: '#1e1e1e',
              borderLeft: `6px solid ${isCorrect ? '#4caf50' : '#f44336'}`,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                color="#fff"
              >
                {index + 1}. {q.question_text}
              </Typography>

              {q.image_url && (
                <Box
                  component="img"
                  src={q.image_url}
                  alt="question"
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    borderRadius: 2,
                    mb: 2,
                    border: '1px solid #444',
                  }}
                />
              )}

              <Stack spacing={1} mb={2}>
                {q.options.map((opt, i) => {
                  const optText = opt.text.trim().toLowerCase();
                  const isUser = optText === userAnswer;
                  const isRight = correctNormalized.includes(optText);

                  return (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: isRight
                          ? '#2e7d32'
                          : isUser
                          ? '#b71c1c'
                          : '#333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: '#fff',
                        border: isUser || isRight ? '1px solid #888' : '1px solid #444',
                      }}
                    >
                      {opt.image && (
                        <img
                          src={opt.image}
                          alt="option"
                          style={{ width: 28, height: 28, borderRadius: 4 }}
                        />
                      )}
                      <Typography>{opt.text}</Typography>

                      {isUser && (
                        <Chip
                          label="Your Answer"
                          color="info"
                          size="small"
                          sx={{
                            ml: 'auto',
                            backgroundColor: '#0288d1',
                            color: '#fff',
                          }}
                        />
                      )}
                      {isRight && (
                        <Chip
                          label="Correct Answer"
                          color="success"
                          size="small"
                          sx={{
                            ml: isUser ? 1 : 'auto',
                            backgroundColor: '#43a047',
                            color: '#fff',
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>

              {q.explanation && (
                <Typography variant="body2" color="#bbb">
                  💡 Explanation: {q.explanation}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
