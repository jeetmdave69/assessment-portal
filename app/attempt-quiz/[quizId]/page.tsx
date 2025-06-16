'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { motion } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { useUser } from '@clerk/nextjs'
import ErrorPopup from '@/components/ErrorPopup'

interface Option {
  text: string
  isCorrect: boolean
}
interface Question {
  id: number
  question_text: string
  options: Option[]
}
interface Quiz {
  id: number
  quiz_title?: string
  quiz_name?: string
  duration: number
  max_attempts: number
}

const QuestionButton = ({ 
  idx, 
  current, 
  answers, 
  questions, 
  setCurrent, 
  submitted 
}: {
  idx: number
  current: number
  answers: Record<number, string[]>
  questions: Question[]
  setCurrent: (index: number) => void
  submitted: boolean
}) => {
  const done = !!answers[questions[idx].id]
  return (
    <Button
      size="small"
      variant={idx === current ? 'contained' : done ? 'outlined' : 'text'}
      color={done ? 'success' : 'primary'}
      onClick={() => setCurrent(idx)}
      sx={{ 
        minWidth: 32,
        minHeight: 32,
        borderRadius: '4px',
        fontSize: '0.75rem',
        padding: 0
      }}
      disabled={submitted}
    >
      {idx + 1}
    </Button>
  )
}

export default function AttemptQuizPage() {
  const params = useParams() as { quizId?: string } | null
  const quizId = params?.quizId
  const router = useRouter()
  const { user } = useUser()

  if (!quizId) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography color="error">Invalid quiz URL – no quizId provided.</Typography>
      </Container>
    )
  }

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [attemptsLoading, setAttemptsLoading] = useState(true)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [timeUpDialogOpen, setTimeUpDialogOpen] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)

  // Anti-cheat measures
  useEffect(() => {
    const killKeys = (e: KeyboardEvent) => {
      const combo = `${e.ctrlKey ? 'Control+' : ''}${e.metaKey ? 'Meta+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`
      const blocked = ['F12', 'Control+Shift+I', 'Control+Shift+J', 'Control+U', 'Control+C', 'Meta+C']
      if (blocked.includes(combo) || e.key === 'F12') e.preventDefault()
    }
    const killMenu = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('keydown', killKeys)
    document.addEventListener('contextmenu', killMenu)

    const prev = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('keydown', killKeys)
      document.removeEventListener('contextmenu', killMenu)
      document.body.style.userSelect = prev
    }
  }, [])

  // Fetch quiz data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizError) throw quizError

        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)

        if (questionError) throw questionError

        const parsed: Question[] = (questionData ?? []).map((q: any) => {
          const correct = JSON.parse(q.correct_answers || '[]').map((s: string) => s.trim().toLowerCase())
          const raw = JSON.parse(q.options || '[]')
          const opts =
            typeof raw[0] === 'string'
              ? raw.map((t: string) => ({ text: t.trim(), isCorrect: correct.includes(t.trim().toLowerCase()) }))
              : raw.map((o: any) => ({ text: o.text.trim(), isCorrect: correct.includes(o.text.trim().toLowerCase()) }))
          return { id: q.id, question_text: q.question_text, options: opts }
        })

        setQuiz(quizData)
        setQuestions(parsed)

        const secs = (quizData?.duration ?? 30) * 60
        setTotalTime(secs)
        setTimeLeft(secs)
      } catch (error) {
        console.error('Error fetching quiz data:', error)
        setErrorPopup('Failed to load quiz data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [quizId])

  // Fetch attempt count
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('attempts')
          .select('id')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)

        if (error) throw error
        setAttemptCount(data?.length ?? 0)
      } catch (error) {
        console.error('Error fetching attempts:', error)
        setErrorPopup('Failed to load attempt history')
      } finally {
        setAttemptsLoading(false)
      }
    }
    fetchAttempts()
  }, [user, quizId])

  // Timer countdown
  useEffect(() => {
    if (submitted || timeLeft === null || timeLeft <= 0) return

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timerId)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerId)
  }, [submitted, timeLeft])

  // Handle timeout when time reaches 0
  useEffect(() => {
    if (timeLeft === 0 && !submitted) {
      handleTimeout()
    }
  }, [timeLeft, submitted])

  const formatTime = (s: number) => {
    const safe = Math.max(0, s ?? 0)
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
  }

  const progress = useMemo(() => {
    if (timeLeft === null || totalTime === 0) return 0
    const safeLeft = Math.max(0, timeLeft)
    return ((totalTime - safeLeft) / totalTime) * 100
  }, [timeLeft, totalTime])

  const answeredCount = Object.keys(answers).length
  const q = questions[current]

  const handleCheckboxChange = useCallback((qid: number, opt: string) => {
    setAnswers((prev) => {
      const prevAns = prev[qid] || []
      return { 
        ...prev, 
        [qid]: prevAns.includes(opt) 
          ? prevAns.filter((t) => t !== opt) 
          : [...prevAns, opt] 
      }
    })
  }, [])

  const buildPayload = () => {
    let score = 0
    const userAns: Record<number, string[]> = {}
    const correctMap: Record<number, string[]> = {}

    questions.forEach((qq) => {
      const ua = answers[qq.id]?.map((s) => s.trim().toLowerCase()) ?? []
      userAns[qq.id] = ua
      const correct = qq.options
        .filter((o) => o.isCorrect)
        .map((o) => o.text.trim().toLowerCase())
      correctMap[qq.id] = correct
      
      if (ua.length === correct.length && ua.every((a) => correct.includes(a))) {
        score += 1
      }
    })

    return { userAns, correctMap, score }
  }

  const submitToDB = async (payload: { userAns: any; correctMap: any; score: number }) => {
    if (!user) {
      setErrorPopup('You must be logged in to submit');
      return { data: null, error: new Error('User not logged in') };
    }

    try {
      console.log('Submitting payload:', payload);
      
      const { data, error } = await supabase
        .from('attempts')
        .insert([{
          quiz_id: quizId,
          user_id: user.id,
          user_name: user.fullName || 'Unknown User',
          answers: JSON.stringify(payload.userAns),
          correct_answers: JSON.stringify(payload.correctMap),
          submitted_at: new Date().toISOString(),
          score: payload.score,
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Submission successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Full submission error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Submission failed') 
      };
    }
  };

  const handleSubmitClick = () => setConfirmDialogOpen(true)

  const confirmSubmission = async () => {
    setConfirmDialogOpen(false);
    
    if (!user) {
      setErrorPopup('You must be logged in to submit');
      return;
    }

    if (quiz && attemptCount >= quiz.max_attempts) {
      setErrorPopup('Maximum attempts reached');
      return;
    }

    setSubmitted(true);
    setAutoSubmitting(true);

    try {
      const payload = buildPayload();
      console.log('Attempting submission with payload:', payload);

      const { data, error } = await submitToDB(payload);

      if (error) {
        console.error('Submission failed with error:', error);
        setErrorPopup(`Submission failed: ${error.message}`);
        setSubmitted(false);
        return;
      }

      if (!data) {
        console.error('Submission failed - no data returned');
        setErrorPopup('Submission failed - please try again');
        setSubmitted(false);
        return;
      }

      console.log('Submission successful, redirecting to result:', data.id);
      router.push(`/result/${data.id}`);
    } catch (error) {
      console.error('Unexpected submission error:', error);
      setErrorPopup('An unexpected error occurred during submission');
      setSubmitted(false);
    } finally {
      setAutoSubmitting(false);
    }
  };

  const handleTimeout = async () => {
    setTimeUpDialogOpen(true);
    setSubmitted(true);
    setAutoSubmitting(true);

    try {
      const payload = buildPayload();
      console.log('Auto-submitting with payload:', payload);

      const { data, error } = await submitToDB(payload);

      if (error) {
        console.error('Auto-submission failed:', error);
        setErrorPopup('Auto-submission failed. Please contact support.');
        return;
      }

      if (!data) {
        console.error('Auto-submission failed - no data returned');
        setErrorPopup('Auto-submission failed - please contact support.');
        return;
      }

      console.log('Auto-submission successful, redirecting to result:', data.id);
      setTimeout(() => router.push(`/result/${data.id}`), 2000);
    } catch (error) {
      console.error('Unexpected auto-submission error:', error);
      setErrorPopup('An error occurred during auto-submission');
    } finally {
      setAutoSubmitting(false);
    }
  };

  if (loading || attemptsLoading) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    )
  }

  if (!quiz) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">
          Quiz not found.
        </Typography>
      </Container>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Box sx={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {/* Left Navigator */}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                minWidth: 180,
                height: 'fit-content'
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} textAlign="center" mb={1}>
                Quiz navigation
              </Typography>

              {/* First row - exactly 7 buttons */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                justifyContent: 'center',
                mb: 1
              }}>
                {questions.slice(0, 7).map((_, idx) => (
                  <QuestionButton 
                    key={idx}
                    idx={idx}
                    current={current}
                    answers={answers}
                    questions={questions}
                    setCurrent={setCurrent}
                    submitted={submitted}
                  />
                ))}
              </Box>

              {/* Second row - exactly 7 buttons */}
              {questions.length > 7 && (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '4px',
                  justifyContent: 'center',
                  mb: 1
                }}>
                  {questions.slice(7, 14).map((_, idx) => (
                    <QuestionButton 
                      key={idx + 7}
                      idx={idx + 7}
                      current={current}
                      answers={answers}
                      questions={questions}
                      setCurrent={setCurrent}
                      submitted={submitted}
                    />
                  ))}
                </Box>
              )}

              {/* Third row - remaining questions */}
              {questions.length > 14 && (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '4px',
                  justifyContent: 'center'
                }}>
                  {questions.slice(14, 20).map((_, idx) => (
                    <QuestionButton 
                      key={idx + 14}
                      idx={idx + 14}
                      current={current}
                      answers={answers}
                      questions={questions}
                      setCurrent={setCurrent}
                      submitted={submitted}
                    />
                  ))}
                </Box>
              )}

              {/* Finish attempt button */}
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleSubmitClick}
                disabled={submitted || timeLeft === 0}
                sx={{ 
                  mt: 2,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  py: 1,
                  fontWeight: 500
                }}
              >
                Finish attempt ...
              </Button>
            </Paper>

            {/* Right Main Quiz */}
            <Box flex={1}>
              <Stack spacing={3}>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5" fontWeight={700}>
                    {quiz.quiz_title ?? quiz.quiz_name ?? 'Untitled Quiz'}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color={timeLeft !== null && timeLeft <= 60 ? 'error.main' : 'primary.main'}
                  >
                    ⏳ {formatTime(timeLeft ?? 0)}
                  </Typography>
                </Box>

                {/* Progress Bar */}
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: timeLeft !== null && timeLeft <= 60 ? 'error.main' : 'primary.main'
                    }
                  }} 
                />

                {/* Status */}
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">
                    Question {current + 1} of {questions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Answered: {answeredCount}/{questions.length}
                  </Typography>
                </Box>

                {/* Question Card */}
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    sx={{
                      borderRadius: 3,
                      boxShadow: 4,
                      background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} mb={1}>
                        Q{current + 1}. {q.question_text}
                      </Typography>
                      <FormGroup>
                        {q.options.map((opt, i) => (
                          <FormControlLabel
                            key={i}
                            control={
                              <Checkbox
                                checked={answers[q.id]?.includes(opt.text) || false}
                                onChange={() => handleCheckboxChange(q.id, opt.text)}
                                disabled={submitted}
                              />
                            }
                            label={opt.text}
                            sx={{ alignItems: 'flex-start', mb: 0.5 }}
                          />
                        ))}
                      </FormGroup>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Nav Buttons */}
                <Box display="flex" justifyContent="space-between">
                  <Button
                    variant="outlined"
                    onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                    disabled={current === 0 || submitted}
                  >
                    Back
                  </Button>
                  {current < questions.length - 1 ? (
                    <Button variant="contained" onClick={() => setCurrent((c) => c + 1)} disabled={submitted}>
                      Next
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmitClick}
                      disabled={submitted || timeLeft === 0}
                    >
                      {submitted ? 'Submitted' : 'Submit'}
                    </Button>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Container>

        {/* Dialogs & Error Popup */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Submit Quiz</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You answered {answeredCount} / {questions.length} questions. Submit now?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button onClick={confirmSubmission} variant="contained">
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={timeUpDialogOpen}>
          <DialogTitle>⏰ Time's Up</DialogTitle>
          <DialogContent>
            <DialogContentText>
              The quiz time has ended. Your answers are being auto-submitted...
            </DialogContentText>
            {autoSubmitting && (
              <Box mt={2} display="flex" justifyContent="center">
                <CircularProgress size={32} />
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {errorPopup && <ErrorPopup message={errorPopup} onClose={() => setErrorPopup(null)} />}
      </Box>
    </motion.div>
  )
}