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
  Radio,
  Stack,
  Typography,
  Alert,
  Grid,
  Skeleton,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { useUser } from '@clerk/nextjs'
import {
  ArrowBack as ArrowBackIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as HelpOutlineIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Send as SendIcon,
  DoneAll as DoneAllIcon,
  EmojiEvents as EmojiEventsIcon,
  Close as CloseIcon,
  Flag as FlagIcon,
  OutlinedFlag as OutlinedFlagIcon
} from '@mui/icons-material'
import CryptoJS from 'crypto-js'

// Types
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
  question_type: 'single' | 'multiple'
}

interface Quiz {
  id: number
  quiz_title: string
  duration: number
  max_attempts: number
  passing_score: number
  show_correct_answers: boolean
  description?: string
}

interface QuizSessionData {
  startTime: number
  answers: Record<number, number[]>
  currentQuestionIndex: number
  quizDuration: number
  markedForReview: number[]
}

// Constants
const TIME_WARNING_THRESHOLD = 60
const LOADING_DELAY = 300
const ANIMATION_DURATION = 0.3
const SESSION_STORAGE_KEY = 'quizSession_'
const ENCRYPTION_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'default-secret'
const SUBMISSION_COOLDOWN = 5000 // 5 seconds

// Security Utilities
const encryptData = (data: any): string => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_SECRET).toString()
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt session data')
  }
}

const decryptData = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_SECRET)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt session data')
  }
}

const validateQuestion = (question: any): Question => {
  if (!question?.id || !question?.question_text) {
    throw new Error('Invalid question format')
  }

  const options = Array.isArray(question.options) 
    ? question.options.map((opt: any, index: number) => ({
        text: opt?.text || `Option ${index + 1}`,
        is_correct: (Array.isArray(question.correct_answers) ? question.correct_answers : []).includes(index)
      }))
    : []

  return {
    id: Number(question.id),
    question_text: String(question.question_text),
    options,
    correct_answers: Array.isArray(question.correct_answers) 
      ? question.correct_answers.map(Number).filter((n: number) => !isNaN(n))
      : [],
    marks: Number(question.marks) || 1,
    explanation: question.explanation ? String(question.explanation) : undefined,
    image_url: question.image_url ? String(question.image_url) : undefined,
    question_type: question.question_type === 'multiple' ? 'multiple' : 'single'
  }
}

const validateQuiz = (quiz: any): Quiz => {
  if (!quiz?.id || !quiz?.quiz_title) {
    throw new Error('Invalid quiz format')
  }

  return {
    id: Number(quiz.id),
    quiz_title: String(quiz.quiz_title),
    duration: Math.max(1, Number(quiz.duration) || 30),
    max_attempts: Math.max(0, Number(quiz.max_attempts) || 0),
    passing_score: Math.max(0, Number(quiz.passing_score) || 0),
    show_correct_answers: Boolean(quiz.show_correct_answers),
    description: quiz.description ? String(quiz.description) : undefined
  }
}

// Custom Components
const LoadingButton = ({
  loading,
  children,
  ...props
}: {
  loading: boolean
  children: React.ReactNode
  [key: string]: any
}) => (
  <Button
    {...props}
    disabled={props.disabled || loading}
    sx={{
      position: 'relative',
      minWidth: 120,
      transition: 'all 0.2s ease',
      ...props.sx
    }}
  >
    <Box
      component="span"
      sx={{
        opacity: loading ? 0 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      {children}
    </Box>
    {loading && (
      <CircularProgress
        size={24}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: '-12px',
          marginLeft: '-12px'
        }}
      />
    )}
  </Button>
)

const QuestionNavigationButton = ({
  index,
  current,
  answered,
  marked,
  onClick,
  disabled
}: {
  index: number
  current: boolean
  answered: boolean
  marked: boolean
  onClick: () => void
  disabled: boolean
}) => {
  return (
    <Tooltip title={`Question ${index + 1}`} arrow>
      <Button
        size="small"
        variant={current ? 'contained' : answered ? 'outlined' : 'text'}
        color={answered ? 'success' : marked ? 'warning' : 'primary'}
        onClick={onClick}
        disabled={disabled}
        sx={{
          minWidth: 40,
          minHeight: 40,
          borderRadius: '12px',
          fontSize: '0.875rem',
          fontWeight: current ? 700 : 500,
          transition: 'all 0.2s ease',
          '&:disabled': {
            opacity: 0.5
          },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {index + 1}
        {marked && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 16px 16px 0',
              borderColor: 'transparent #ff9800 transparent transparent'
            }}
          />
        )}
      </Button>
    </Tooltip>
  )
}

const TimeDisplay = ({ seconds }: { seconds: number }) => {
  const formattedTime = useMemo(() => {
    const safeSeconds = Math.max(0, seconds)
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [seconds])

  const isWarning = seconds <= TIME_WARNING_THRESHOLD

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <TimerIcon color={isWarning ? 'error' : 'primary'} />
      <Typography
        variant="h6"
        color={isWarning ? 'error.main' : 'primary.main'}
        component={motion.span}
        animate={{ scale: isWarning ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: isWarning ? Infinity : 0, duration: 1 }}
        fontWeight={600}
      >
        {formattedTime}
      </Typography>
    </Box>
  )
}

const ExplanationBox = ({ explanation }: { explanation: string }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    transition={{ duration: ANIMATION_DURATION }}
  >
    <Box
      sx={{
        mt: 3,
        p: 2.5,
        bgcolor: 'rgba(2, 136, 209, 0.08)',
        borderRadius: 2,
        borderLeft: '4px solid',
        borderColor: 'info.main'
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <HelpOutlineIcon color="info" />
        <Typography variant="subtitle2" color="info.dark" fontWeight={600}>
          Explanation:
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {explanation}
      </Typography>
    </Box>
  </motion.div>
)

export default function QuizAttemptPage() {
  const params = useParams() as { quizId?: string } | null
  const quizId = params?.quizId
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // State
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [markedForReview, setMarkedForReview] = useState<number[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
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
  const [sessionRestored, setSessionRestored] = useState(false)
  const [lastSubmissionAttempt, setLastSubmissionAttempt] = useState(0)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)

  // Derived state
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const answeredCount = Object.keys(answers).length
  const progress = useMemo(() => {
    if (timeLeft === null || totalTime === 0) return 0
    return ((totalTime - Math.max(0, timeLeft)) / totalTime) * 100
  }, [timeLeft, totalTime])

  // Session storage key
  const sessionKey = useMemo(() => {
    return user && quizId ? `${SESSION_STORAGE_KEY}${user.id}_${quizId}` : null
  }, [user, quizId])

  // Save session to localStorage with encryption
  const saveSession = useCallback(() => {
    if (!sessionKey || submitted || timeLeft === null || !quiz || !timerStartTime) return
    
    const sessionData: QuizSessionData = {
      startTime: timerStartTime,
      answers,
      currentQuestionIndex,
      quizDuration: quiz.duration * 60,
      markedForReview
    }
    
    try {
      const encryptedData = encryptData(sessionData)
      localStorage.setItem(sessionKey, encryptedData)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }, [sessionKey, submitted, timeLeft, quiz, answers, currentQuestionIndex, markedForReview, timerStartTime])

  // Load session from localStorage with decryption
  const loadSession = useCallback(() => {
    if (!sessionKey) return null
    
    try {
      const savedData = localStorage.getItem(sessionKey)
      if (!savedData) return null
      
      const sessionData = decryptData(savedData) as QuizSessionData
      
      if (!sessionData || typeof sessionData !== 'object') {
        throw new Error('Invalid session data')
      }
      
      const elapsedSeconds = Math.floor((Date.now() - sessionData.startTime) / 1000)
      const remainingTime = Math.max(0, sessionData.quizDuration - elapsedSeconds)
      
      // If time is up, don't restore the session
      if (remainingTime <= 0) {
        clearSession()
        return null
      }
      
      return {
        ...sessionData,
        remainingTime
      }
    } catch (e) {
      console.error('Failed to load session data', e)
      clearSession()
      return null
    }
  }, [sessionKey])

  // Clear session from localStorage
  const clearSession = useCallback(() => {
    if (!sessionKey) return
    localStorage.removeItem(sessionKey)
  }, [sessionKey])

  // Anti-cheat measures
  useEffect(() => {
    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault()
    }

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const preventKeyCombos = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener('copy', preventCopyPaste)
    document.addEventListener('cut', preventCopyPaste)
    document.addEventListener('paste', preventCopyPaste)
    document.addEventListener('contextmenu', preventContextMenu)
    document.addEventListener('keydown', preventKeyCombos)

    // Disable text selection
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('copy', preventCopyPaste)
      document.removeEventListener('cut', preventCopyPaste)
      document.removeEventListener('paste', preventCopyPaste)
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('keydown', preventKeyCombos)
      document.body.style.userSelect = ''
    }
  }, [])

  // Prevent page reload/exit
  useEffect(() => {
    if (submitted) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your quiz progress will be lost.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [submitted])

  // Fetch quiz data with improved security
  useEffect(() => {
    if (!isUserLoaded) return

    const fetchQuizData = async () => {
      if (!quizId || !user) {
        setQuizNotFound(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        const parsedQuizId = Number(quizId)
        if (isNaN(parsedQuizId)) {
          throw new Error('Invalid quiz ID')
        }

        const [quizResponse, questionsResponse] = await Promise.all([
          supabase.from('quizzes').select('*').eq('id', parsedQuizId).single(),
          supabase
            .from('questions')
            .select(`
              id,
              question_text,
              options,
              correct_answers,
              marks,
              explanation,
              image_url,
              question_type
            `)
            .eq('quiz_id', parsedQuizId)
            .order('id', { ascending: true })
        ])

        if (quizResponse.error || !quizResponse.data) {
          throw quizResponse.error || new Error('Quiz not found')
        }

        if (questionsResponse.error) {
          throw questionsResponse.error
        }

        if (!questionsResponse.data || questionsResponse.data.length === 0) {
          throw new Error('No questions found for this quiz')
        }

        const validatedQuiz = validateQuiz(quizResponse.data)
        const validatedQuestions = questionsResponse.data.map(validateQuestion)

        setQuiz(validatedQuiz)
        setQuestions(validatedQuestions)
        const durationInSeconds = validatedQuiz.duration * 60
        setTotalTime(durationInSeconds)

        let session = loadSession()
        if (session && session.remainingTime > 0) {
          setTimeLeft(session.remainingTime)
          setAnswers(session.answers)
          setCurrentQuestionIndex(session.currentQuestionIndex)
          setMarkedForReview(session.markedForReview || [])
          setTimerStartTime(session.startTime)
          setSessionRestored(true)
        } else {
          const startTime = Date.now()
          setTimerStartTime(startTime)
          setTimeLeft(durationInSeconds)
          setAnswers({})
          setCurrentQuestionIndex(0)
          setMarkedForReview([])
          setSessionRestored(true)
          if (sessionKey) {
            const sessionData = {
              startTime,
              answers: {},
              currentQuestionIndex: 0,
              quizDuration: durationInSeconds,
              markedForReview: []
            }
            try {
              const encryptedData = encryptData(sessionData)
              localStorage.setItem(sessionKey, encryptedData)
            } catch (error) {
              console.error('Failed to save new session:', error)
            }
          }
        }
      } catch (err) {
        console.error('Quiz loading error:', err)
        setError('Failed to load quiz. Please try again later.')
        setQuizNotFound(true)
        clearSession()
      } finally {
        setTimeout(() => setLoading(false), LOADING_DELAY)
      }
    }

    fetchQuizData()
  }, [quizId, loadSession, clearSession, isUserLoaded, user, sessionKey])

  // Save session on changes
  useEffect(() => {
    if (!sessionRestored) return
    
    const saveInterval = setInterval(() => {
      saveSession()
    }, 5000)
    
    return () => {
      clearInterval(saveInterval)
      saveSession()
    }
  }, [sessionRestored, saveSession])

  // Fetch attempt count with rate limiting protection
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user || !quizId || !isUserLoaded) return
      
      try {
        setAttemptsLoading(true)
        
        const parsedQuizId = Number(quizId)
        if (isNaN(parsedQuizId)) {
          throw new Error('Invalid quiz ID')
        }

        const { data, error } = await supabase
          .from('attempts')
          .select('id')
          .eq('quiz_id', parsedQuizId)
          .eq('user_id', user.id)

        if (error) throw error
        setAttemptCount(data?.length ?? 0)
      } catch (err) {
        console.error('Attempts loading error:', err)
        setError('Failed to load attempt history')
      } finally {
        setTimeout(() => setAttemptsLoading(false), LOADING_DELAY)
      }
    }
    
    fetchAttempts()
  }, [user, quizId, isUserLoaded])

  // Timer logic
  useEffect(() => {
    if (submitted || timeLeft === null || timeLeft <= 0 || !timerStartTime) return

    const timerId = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - timerStartTime) / 1000)
      const remainingTime = Math.max(0, totalTime - elapsedSeconds)
      
      setTimeLeft(remainingTime)
      
      if (remainingTime <= 0) {
        clearInterval(timerId)
        handleTimeout()
      }
    }, 1000)

    return () => clearInterval(timerId)
  }, [submitted, timeLeft, totalTime, timerStartTime])

  // Handlers with improved security
  const handleAnswerChange = useCallback((questionId: number, optionIndex: number) => {
    setAnswers(prev => {
      const question = questions.find(q => q.id === questionId)
      if (!question) return prev
      
      const isSingle = question.question_type === 'single'
      const prevAnswer = prev[questionId] || []
      
      const newAnswers = {
        ...prev,
        [questionId]: isSingle 
          ? [optionIndex]
          : prevAnswer.includes(optionIndex)
            ? prevAnswer.filter(i => i !== optionIndex)
            : [...prevAnswer, optionIndex]
      }
      
      return newAnswers
    })
  }, [questions])

  const toggleMarkForReview = useCallback((questionId: number) => {
    setMarkedForReview(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }, [])

  const buildSubmissionPayload = () => {
    let score = 0
    const userAnswers: Record<number, number[]> = {}
    const correctAnswersMap: Record<number, number[]> = {}

    questions.forEach(question => {
      const userAnswer = answers[question.id] || []
      userAnswers[question.id] = userAnswer
      correctAnswersMap[question.id] = question.correct_answers

      if (userAnswer.length === question.correct_answers.length && 
          userAnswer.every(a => question.correct_answers.includes(a))) {
        score += question.marks
      }
    })

    return { userAnswers, correctAnswersMap, score }
  }

  const submitQuizAttempt = async () => {
    const now = Date.now()
    if (now - lastSubmissionAttempt < SUBMISSION_COOLDOWN) {
      throw new Error('Please wait before submitting again')
    }
    setLastSubmissionAttempt(now)

    if (!user || !quizId || !quiz || !isUserLoaded) {
      throw new Error('Authentication required')
    }

    if (quiz.max_attempts > 0 && attemptCount >= quiz.max_attempts) {
      throw new Error(`Maximum attempts reached (${quiz.max_attempts})`)
    }

    const payload = buildSubmissionPayload()
    
    try {
      const { data, error } = await supabase
        .from('attempts')
        .insert({
          quiz_id: Number(quizId),
          user_id: user.id,
          user_name: user.fullName || 'Anonymous',
          answers: payload.userAnswers,
          correct_answers: payload.correctAnswersMap,
          submitted_at: new Date().toISOString(),
          score: payload.score,
          total_marks: questions.reduce((sum, q) => sum + q.marks, 0),
          marked_questions: markedForReview
        })
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from submission')

      return data
    } catch (err) {
      console.error('Submission error:', err)
      throw new Error('Submission failed. Please try again.')
    }
  }

  const handleSubmitClick = () => setConfirmDialogOpen(true)

  const confirmSubmission = async () => {
    setConfirmDialogOpen(false)
    setSubmitted(true)
    setAutoSubmitting(true)
    clearSession()

    try {
      const result = await submitQuizAttempt()
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
    clearSession()

    try {
      const result = await submitQuizAttempt()
      setTimeout(() => router.push(`/result/${result.id}`), 2000)
    } catch (err) {
      console.error('Auto-submission error:', err)
      setError('Auto-submission failed. Please contact support.')
    } finally {
      setAutoSubmitting(false)
    }
  }

  const navigateQuestion = (direction: 'prev' | 'next') => {
    setCurrentQuestionIndex(prev => 
      direction === 'prev' 
        ? Math.max(0, prev - 1) 
        : Math.min(questions.length - 1, prev + 1)
    )
  }

  // Loading state
  if (loading || attemptsLoading || !isUserLoaded) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        gap: 3,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>
          Preparing your quiz...
        </Typography>
        <Box sx={{ width: '80%', maxWidth: 400 }}>
          <Skeleton variant="rounded" width="100%" height={60} sx={{ mb: 2, borderRadius: 3 }} />
          <Skeleton variant="rounded" width="100%" height={400} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    )
  }

  // Error state
  if (quizNotFound || !quiz) {
    return (
      <Container sx={{ 
        mt: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}>
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4,
            width: '100%',
            maxWidth: 600,
            boxShadow: 3,
            borderRadius: 3
          }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography fontWeight={600}>
            {error || 'Quiz not found or you don\'t have permission to access it.'}
          </Typography>
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => router.push('/')}
          startIcon={<ArrowBackIcon />}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 600,
            boxShadow: 3
          }}
        >
          Return to Dashboard
        </Button>
      </Container>
    )
  }

  // Main render
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: ANIMATION_DURATION }}
    >
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #f5f7fa 0%, #e4e8ed 100%)',
        py: 4 
      }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {/* Navigation Panel */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3,
              bgcolor: 'background.paper',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
              position: 'sticky',
              top: 20,
              alignSelf: 'flex-start',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(0,0,0,0.05)',
              width: isMobile ? '100%' : 300,
              flexShrink: 0
            }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <EmojiEventsIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Quiz Navigation
                </Typography>
              </Stack>
              
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {questions.map((question, index) => (
                  <Grid item xs={4} sm={3} md={4} key={question.id}>
                    <QuestionNavigationButton
                      index={index}
                      current={index === currentQuestionIndex}
                      answered={!!answers[question.id]}
                      marked={markedForReview.includes(question.id)}
                      onClick={() => setCurrentQuestionIndex(index)}
                      disabled={submitted}
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Answered: 
                  </Typography>
                  <Chip 
                    label={`${answeredCount}/${questions.length}`}
                    color={answeredCount === questions.length ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Marked for Review:
                  </Typography>
                  <Chip 
                    label={markedForReview.length}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Time Remaining:
                  </Typography>
                  <TimeDisplay seconds={timeLeft || 0} />
                </Box>

                {quiz.max_attempts > 0 && (
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Attempts:
                    </Typography>
                    <Chip 
                      label={`${attemptCount}/${quiz.max_attempts}`}
                      color={attemptCount >= quiz.max_attempts ? 'error' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <LoadingButton
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleSubmitClick}
                disabled={submitted || timeLeft === 0 || (quiz.max_attempts > 0 && attemptCount >= quiz.max_attempts)}
                loading={autoSubmitting}
                sx={{ 
                  mb: 1,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)'
                }}
                startIcon={<SendIcon />}
              >
                Submit Quiz
              </LoadingButton>

              {quiz.max_attempts > 0 && attemptCount >= quiz.max_attempts && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Maximum attempts reached ({quiz.max_attempts})
                </Alert>
              )}

              {sessionRestored && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Your previous session was restored
                </Alert>
              )}
            </Paper>

            {/* Main Content */}
            <Box flex={1}>
              <Stack spacing={3}>
                {/* Quiz Header */}
                <Paper 
                  component={motion.div}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: ANIMATION_DURATION }}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <Box>
                      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                        {quiz.quiz_title}
                      </Typography>
                      {quiz.description && (
                        <Typography variant="body2" color="text.secondary">
                          {quiz.description}
                        </Typography>
                      )}
                    </Box>
                    <TimeDisplay seconds={timeLeft || 0} />
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ 
                      height: 8, 
                      mt: 2,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: timeLeft && timeLeft <= TIME_WARNING_THRESHOLD ? 'error.main' : 'primary.main',
                        borderRadius: 4
                      }
                    }}
                  />
                </Paper>

                {/* Current Question */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion?.id || 'empty'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: ANIMATION_DURATION }}
                  >
                    {currentQuestion ? (
                      <Card sx={{ 
                        borderRadius: 3,
                        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                              <Box component="span" color="primary.main">Q{currentQuestionIndex + 1}.</Box> {currentQuestion.question_text}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Chip 
                                label={`${currentQuestion.marks} mark${currentQuestion.marks > 1 ? 's' : ''}`}
                                color="secondary"
                                size="small"
                                variant="outlined"
                              />
                              <Tooltip title={markedForReview.includes(currentQuestion.id) ? "Unmark for review" : "Mark for review"}>
                                <IconButton
                                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                                  disabled={submitted}
                                  color={markedForReview.includes(currentQuestion.id) ? "warning" : "default"}
                                  size="small"
                                >
                                  {markedForReview.includes(currentQuestion.id) ? (
                                    <FlagIcon color="warning" />
                                  ) : (
                                    <OutlinedFlagIcon />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>

                          {currentQuestion.image_url && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                              <Box 
                                component="img" 
                                src={currentQuestion.image_url} 
                                alt="Question" 
                                sx={{ 
                                  maxWidth: '100%', 
                                  maxHeight: 300, 
                                  mb: 3,
                                  borderRadius: 2,
                                  boxShadow: 3,
                                  border: '1px solid rgba(0,0,0,0.1)'
                                }} 
                              />
                            </motion.div>
                          )}

                          <FormGroup>
                            {currentQuestion.options.map((option: QuizOption, index: number) => {
                              const isSingle = currentQuestion.question_type === 'single'
                              const isChecked = answers[currentQuestion.id]?.includes(index) || false
                              const isCorrect = currentQuestion.correct_answers.includes(index)
                              
                              return (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                >
                                  <FormControlLabel
                                    control={
                                      isSingle ? (
                                        <Radio
                                          checked={isChecked}
                                          onChange={() => handleAnswerChange(currentQuestion.id, index)}
                                          disabled={submitted}
                                          name={`question-${currentQuestion.id}`}
                                          color={submitted && isCorrect ? 'success' : 'primary'}
                                        />
                                      ) : (
                                        <Checkbox
                                          checked={isChecked}
                                          onChange={() => handleAnswerChange(currentQuestion.id, index)}
                                          disabled={submitted}
                                          color={submitted && isCorrect ? 'success' : 'primary'}
                                        />
                                      )
                                    }
                                    label={
                                      <Typography>
                                        {option.text}
                                        {submitted && isCorrect && (
                                          <Box 
                                            component="span" 
                                            sx={{ 
                                              color: 'success.main', 
                                              ml: 1,
                                              fontWeight: 'bold'
                                            }}
                                          >
                                            ✓ Correct
                                          </Box>
                                        )}
                                      </Typography>
                                    }
                                    sx={{
                                      p: 1.5,
                                      borderRadius: 2,
                                      bgcolor: submitted && isCorrect 
                                        ? 'rgba(76, 175, 80, 0.1)' 
                                        : isChecked
                                          ? 'rgba(25, 118, 210, 0.1)'
                                          : 'transparent',
                                      mb: 1,
                                      transition: 'all 0.2s ease',
                                      border: '1px solid',
                                      borderColor: submitted && isCorrect 
                                        ? 'success.light'
                                        : isChecked
                                          ? 'primary.light'
                                          : 'transparent',
                                      '&:hover': {
                                        bgcolor: submitted 
                                          ? 'transparent' 
                                          : 'rgba(0, 0, 0, 0.04)'
                                      }
                                    }}
                                  />
                                </motion.div>
                              )
                            })}
                          </FormGroup>

                          {submitted && currentQuestion.explanation && (
                            <ExplanationBox explanation={currentQuestion.explanation} />
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Skeleton variant="rounded" width="100%" height={400} sx={{ borderRadius: 3 }} />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <Box 
                  display="flex" 
                  justifyContent="space-between"
                  component={motion.div}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <LoadingButton
                    variant="outlined"
                    onClick={() => navigateQuestion('prev')}
                    disabled={currentQuestionIndex === 0 || submitted}
                    loading={autoSubmitting}
                    startIcon={<NavigateBeforeIcon />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      fontWeight: 600
                    }}
                  >
                    Previous
                  </LoadingButton>
                  
                  {!isLastQuestion ? (
                    <LoadingButton
                      variant="contained"
                      onClick={() => navigateQuestion('next')}
                      disabled={submitted}
                      loading={autoSubmitting}
                      endIcon={<NavigateNextIcon />}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)'
                      }}
                    >
                      Next
                    </LoadingButton>
                  ) : (
                    <LoadingButton
                      variant="contained"
                      color="primary"
                      onClick={handleSubmitClick}
                      disabled={submitted || timeLeft === 0 || (quiz.max_attempts > 0 && attemptCount >= quiz.max_attempts)}
                      loading={autoSubmitting}
                      endIcon={<DoneAllIcon />}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)'
                      }}
                    >
                      Submit Quiz
                    </LoadingButton>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Container>

        {/* Confirmation Dialog */}
        <Dialog 
          open={confirmDialogOpen} 
          onClose={() => setConfirmDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1
            }
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            <SendIcon color="primary" />
            Confirm Submission
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              You've answered {answeredCount} out of {questions.length} questions.
              {answeredCount < questions.length && (
                <Box component="span" color="error.main" fontWeight={600}>
                  {' '}You have {questions.length - answeredCount} unanswered questions.
                </Box>
              )}
            </DialogContentText>
            <DialogContentText sx={{ mt: 2 }}>
              You've marked {markedForReview.length} questions for review.
            </DialogContentText>
            <DialogContentText sx={{ mt: 2 }}>
              Are you sure you want to submit your quiz?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setConfirmDialogOpen(false)}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Cancel
            </Button>
            <LoadingButton 
              onClick={confirmSubmission} 
              variant="contained"
              loading={autoSubmitting}
              sx={{ borderRadius: 2, fontWeight: 600 }}
              startIcon={<SendIcon />}
            >
              Submit
            </LoadingButton>
          </DialogActions>
        </Dialog>

        {/* Time Up Dialog */}
        <Dialog 
          open={timeUpDialogOpen}
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1
            }
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            <TimerIcon color="error" />
            Time's Up!
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Your quiz is being automatically submitted. Please wait...
            </DialogContentText>
            <Box display="flex" justifyContent="center" mt={3}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          </DialogContent>
        </Dialog>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: ANIMATION_DURATION }}
            >
              <Alert 
                severity="error" 
                onClose={() => setError(null)}
                sx={{ 
                  position: 'fixed', 
                  bottom: 20, 
                  right: 20, 
                  minWidth: 300,
                  boxShadow: 3,
                  borderRadius: 3,
                  border: '1px solid rgba(211, 47, 47, 0.2)'
                }}
              >
                <Typography fontWeight={600}>{error}</Typography>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  )
}