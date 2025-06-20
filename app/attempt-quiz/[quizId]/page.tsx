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
  Alert,
  Grid,
} from '@mui/material'
import { motion } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { useUser } from '@clerk/nextjs'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface QuizOption {
  text: string
  is_correct: boolean
}

interface Question {
  id: number
  question_text: string
  options: QuizOption[]
  correct_answers: number[]
  marks: number
  explanation?: string
  image_url?: string
}

interface Quiz {
  id: number
  quiz_title: string
  duration: number
  max_attempts: number
  passing_score: number
  show_correct_answers: boolean
}

const QuestionButton = ({
  idx,
  current,
  answers,
  questionId,
  setCurrent,
  submitted
}: {
  idx: number
  current: number
  answers: Record<number, number[]>
  questionId: number
  setCurrent: (index: number) => void
  submitted: boolean
}) => {
  const done = !!answers[questionId]
  return (
    <Button
      size="small"
      variant={idx === current ? 'contained' : done ? 'outlined' : 'text'}
      color={done ? 'success' : 'primary'}
      onClick={() => setCurrent(idx)}
      sx={{
        minWidth: 32,
        minHeight: 32,
        borderRadius: '8px',
        fontSize: '0.75rem',
        padding: 0,
        '&:disabled': {
          opacity: 0.5
        }
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

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [attemptsLoading, setAttemptsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [timeUpDialogOpen, setTimeUpDialogOpen] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)
  const [quizNotFound, setQuizNotFound] = useState(false)

  // Fetch quiz data
  useEffect(() => {
    const fetchData = async () => {
      if (!quizId) {
        setQuizNotFound(true)
        setLoading(false)
        return
      }

      try {
        // 1. Fetch quiz
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizError || !quizData) {
          setQuizNotFound(true)
          throw quizError || new Error('Quiz not found')
        }

        // 2. Fetch questions
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select(`
            id,
            question_text,
            options,
            correct_answers,
            marks,
            explanation,
            image_url
          `)
          .eq('quiz_id', quizId)
          .order('id', { ascending: true })

        if (questionError) throw questionError
        if (!questionData || questionData.length === 0) {
          throw new Error('No questions found for this quiz')
        }

        // 3. Transform questions data
        const parsedQuestions: Question[] = questionData.map((q: any) => {
          // Handle cases where options might be malformed
          let options: any[] = []
          try {
            options = Array.isArray(q.options) ? q.options : []
          } catch (e) {
            console.error('Error parsing options:', e)
            options = []
          }

          // Handle cases where correct_answers might be malformed
          let correct_answers: number[] = []
          try {
            correct_answers = Array.isArray(q.correct_answers) ? q.correct_answers : []
          } catch (e) {
            console.error('Error parsing correct_answers:', e)
            correct_answers = []
          }

          return {
            id: q.id,
            question_text: q.question_text || 'No question text',
            options: options.map((opt: any, index: number) => ({
              text: opt?.text || `Option ${index + 1}`,
              is_correct: correct_answers.includes(index)
            })),
            correct_answers,
            marks: Number(q.marks) || 1,
            explanation: q.explanation,
            image_url: q.image_url
          }
        })

        setQuiz(quizData)
        setQuestions(parsedQuestions)
        setTotalTime((quizData.duration || 30) * 60)
        setTimeLeft((quizData.duration || 30) * 60)
      } catch (err) {
        console.error('Quiz loading error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load quiz')
        setQuizNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [quizId])

  // Fetch attempt count
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user || !quizId) return
      try {
        const { data, error } = await supabase
          .from('attempts')
          .select('id')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)

        if (error) throw error
        setAttemptCount(data?.length ?? 0)
      } catch (err) {
        console.error('Attempts loading error:', err)
        setError('Failed to load attempt history')
      } finally {
        setAttemptsLoading(false)
      }
    }
    fetchAttempts()
  }, [user, quizId])

  // Timer logic
  useEffect(() => {
    if (submitted || timeLeft === null || timeLeft <= 0) return

    const timerId = setInterval(() => {
      setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timerId)
  }, [submitted, timeLeft])

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
    return ((totalTime - Math.max(0, timeLeft)) / totalTime) * 100
  }, [timeLeft, totalTime])

  const handleCheckboxChange = useCallback((qid: number, optIndex: number) => {
    setAnswers(prev => {
      const prevAns = prev[qid] || []
      const question = questions.find(q => q.id === qid)
      const isSingle = question?.correct_answers.length === 1
      
      return {
        ...prev,
        [qid]: isSingle 
          ? [optIndex]
          : prevAns.includes(optIndex)
            ? prevAns.filter(i => i !== optIndex)
            : [...prevAns, optIndex]
      }
    })
  }, [questions])

  const buildPayload = () => {
    let score = 0
    const userAns: Record<number, number[]> = {}
    const correctMap: Record<number, number[]> = {}

    questions.forEach(q => {
      const ua = answers[q.id] || []
      userAns[q.id] = ua
      correctMap[q.id] = q.correct_answers

      if (ua.length === q.correct_answers.length && 
          ua.every(a => q.correct_answers.includes(a))) {
        score += q.marks
      }
    })

    return { userAns, correctMap, score }
  }

  const submitToDB = async (payload: { userAns: any; correctMap: any; score: number }) => {
    if (!user || !quizId) {
      throw new Error('You must be logged in to submit')
    }

    try {
      const { data, error } = await supabase
        .from('attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          user_name: user.fullName || 'Anonymous',
          answers: payload.userAns,
          correct_answers: payload.correctMap,
          submitted_at: new Date().toISOString(),
          score: payload.score,
          total_marks: questions.reduce((sum, q) => sum + q.marks, 0),
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', error)
        throw new Error(error.message || 'Submission failed')
      }

      if (!data) {
        throw new Error('No data returned from submission')
      }

      return data
    } catch (err) {
      console.error('Full submission error:', err)
      throw new Error(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  const handleSubmitClick = () => setConfirmDialogOpen(true)

  const confirmSubmission = async () => {
    setConfirmDialogOpen(false)
    setSubmitted(true)
    setAutoSubmitting(true)

    try {
      if (!user) throw new Error('Authentication required')
      if (quiz && attemptCount >= quiz.max_attempts) {
        throw new Error(`Maximum attempts reached (${quiz.max_attempts})`)
      }

      const payload = buildPayload()
      const result = await submitToDB(payload)

      if (!result) throw new Error('Submission failed - no result returned')
      router.push(`/result/${result.id}`)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Submission failed')
      setSubmitted(false)
    } finally {
      setAutoSubmitting(false)
    }
  }

  const handleTimeout = async () => {
    setTimeUpDialogOpen(true)
    setSubmitted(true)
    setAutoSubmitting(true)

    try {
      const payload = buildPayload()
      const result = await submitToDB(payload)

      if (!result) throw new Error('Auto-submission failed - no result returned')
      setTimeout(() => router.push(`/result/${result.id}`), 2000)
    } catch (err) {
      console.error('Auto-submission error:', err)
      setError('Auto-submission failed. Please contact support.')
    } finally {
      setAutoSubmitting(false)
    }
  }

  if (loading || attemptsLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Loading quiz...
        </Typography>
      </Box>
    )
  }

  if (quizNotFound || !quiz) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Quiz not found or you don\'t have permission to access it.'}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => router.push('/')}
          startIcon={<ArrowBackIcon />}
        >
          Return to Dashboard
        </Button>
      </Container>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        py: 4 
      }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {/* Navigation Panel */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3,
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 20,
              alignSelf: 'flex-start'
            }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Questions
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {questions.map((q, idx) => (
                  <Grid item xs={4} sm={3} key={q.id}>
                    <QuestionButton
                      idx={idx}
                      current={current}
                      answers={answers}
                      questionId={q.id}
                      setCurrent={setCurrent}
                      submitted={submitted}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                Answered: {Object.keys(answers).length}/{questions.length}
              </Typography>

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmitClick}
                disabled={submitted || timeLeft === 0}
                sx={{ mb: 1 }}
              >
                Submit Quiz
              </Button>

              {quiz.max_attempts > 0 && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Attempts: {attemptCount}/{quiz.max_attempts}
                </Typography>
              )}
            </Paper>

            {/* Main Content */}
            <Box flex={1}>
              <Stack spacing={3}>
                {/* Quiz Header */}
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Typography variant="h5" fontWeight={700}>
                      {quiz.quiz_title}
                    </Typography>
                    <Typography variant="h6" color={timeLeft && timeLeft <= 60 ? 'error.main' : 'primary.main'}>
                      Time: {formatTime(timeLeft || 0)}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ 
                      height: 8, 
                      mt: 2,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: timeLeft && timeLeft <= 60 ? 'error.main' : 'primary.main'
                      }
                    }}
                  />
                </Paper>

                {/* Current Question */}
                {questions[current] && (
                  <motion.div
                    key={questions[current].id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} mb={3}>
                          Q{current + 1}. {questions[current].question_text}
                        </Typography>

                        {questions[current].image_url && (
                          <Box 
                            component="img" 
                            src={questions[current].image_url!} 
                            alt="Question" 
                            sx={{ 
                              maxWidth: '100%', 
                              maxHeight: 300, 
                              mb: 3,
                              borderRadius: 2
                            }} 
                          />
                        )}

                        <FormGroup>
                          {questions[current].options.map((opt, i) => (
                            <FormControlLabel
                              key={i}
                              control={
                                <Checkbox
                                  checked={answers[questions[current].id]?.includes(i) || false}
                                  onChange={() => handleCheckboxChange(questions[current].id, i)}
                                  disabled={submitted}
                                />
                              }
                              label={
                                <Typography>
                                  {opt.text}
                                  {submitted && questions[current].correct_answers.includes(i) && (
                                    <Box component="span" sx={{ color: 'success.main', ml: 1 }}>✓</Box>
                                  )}
                                </Typography>
                              }
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: submitted && questions[current].correct_answers.includes(i) 
                                  ? 'success.light' 
                                  : 'transparent',
                                mb: 1
                              }}
                            />
                          ))}
                        </FormGroup>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <Box display="flex" justifyContent="space-between">
                  <Button
                    variant="outlined"
                    onClick={() => setCurrent(c => Math.max(0, c - 1))}
                    disabled={current === 0}
                  >
                    Previous
                  </Button>
                  {current < questions.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={() => setCurrent(c => c + 1)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmitClick}
                      disabled={submitted}
                    >
                      Submit Quiz
                    </Button>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Container>

        {/* Dialogs */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Submission</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You've answered {Object.keys(answers).length} out of {questions.length} questions.
              Submit now?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmSubmission} variant="contained">
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={timeUpDialogOpen}>
          <DialogTitle>Time's Up!</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Your quiz is being automatically submitted...
            </DialogContentText>
            {autoSubmitting && <CircularProgress sx={{ mt: 2 }} />}
          </DialogContent>
        </Dialog>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ position: 'fixed', bottom: 20, right: 20, minWidth: 300 }}
          >
            {error}
          </Alert>
        )}
      </Box>
    </motion.div>
  )
}