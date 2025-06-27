'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Radio,
  RadioGroup,
} from '@mui/material'
import { motion } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { useUser } from '@clerk/nextjs'
import ErrorPopup from '@/components/ErrorPopup'
import {
  Flag as FlagIcon,
  FlagOutlined as FlagOutlinedIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  NavigateBefore as BackIcon,
  NavigateNext as NextIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as HelpOutlineIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material'

interface Option {
  text: string
  isCorrect: boolean
}
interface Question {
  id: number
  question_text: string
  options: Option[]
  section_id: number
  marks?: number
  question_type: string
}
interface Quiz {
  id: number
  quiz_title?: string
  quiz_name?: string
  duration: number
  max_attempts: number
  passing_score?: number
}

// Navigation color constants for formal, assessment-portal style
const NAV_COLORS = {
  attempted: '#222', // dark gray for attempted
  unattempted: '#fff', // white for unattempted
  current: '#e0e0e0', // light gray for current
  flagged: '#fff', // white, but with red flag icon
  bookmarked: '#fffbe6', // pale yellow for bookmarked
  borderAttempted: '#222',
  borderUnattempted: '#bbb',
  borderCurrent: '#222',
  borderBookmarked: '#e6b800',
}

const QuestionButton = ({
  idx,
  current,
  answers,
  flagged,
  questions,
  setCurrent,
  submitted,
  toggleFlag,
  bookmarked,
}: {
  idx: number
  current: number
  answers: Record<number, string[]>
  flagged: Record<number, boolean>
  questions: Question[]
  setCurrent: (index: number) => void
  submitted: boolean
  toggleFlag: (qid: number) => void
  bookmarked: Record<number, boolean>
}) => {
  const done = !!answers[questions[idx].id]
  const isFlagged = flagged[questions[idx].id]
  const isCurrent = idx === current
  const isBookmarked = bookmarked[questions[idx].id]

  // Determine color scheme
  let bgcolor = NAV_COLORS.unattempted
  let color = '#222'
  let border = `1.5px solid ${NAV_COLORS.borderUnattempted}`
  if (isCurrent) {
    bgcolor = NAV_COLORS.current
    border = `2px solid ${NAV_COLORS.borderCurrent}`
    color = '#222'
  } else if (isBookmarked) {
    bgcolor = NAV_COLORS.bookmarked
    border = `1.5px solid ${NAV_COLORS.borderBookmarked}`
    color = '#222'
  } else if (done) {
    bgcolor = NAV_COLORS.attempted
    border = `1.5px solid ${NAV_COLORS.borderAttempted}`
    color = '#fff'
  }

  return (
    <Box position="relative" sx={{ display: 'inline-block' }}>
      <Button
        size="medium"
        variant="contained"
        sx={{
          minWidth: 40,
          minHeight: 40,
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: isCurrent ? 700 : 500,
          boxShadow: isCurrent ? 2 : 0,
          border,
          bgcolor,
          color,
          transition: 'all 0.2s',
          p: 0,
        }}
        onClick={() => setCurrent(idx)}
        disabled={submitted}
      >
        {idx + 1}
      </Button>
      <IconButton
        size="small"
        onClick={e => {
          e.stopPropagation()
          toggleFlag(questions[idx].id)
        }}
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          zIndex: 2,
          bgcolor: '#fff',
          p: 0.5,
          border: isFlagged ? '1.5px solid #d32f2f' : '1.5px solid #eee',
          boxShadow: 1,
          '&:hover': {
            bgcolor: '#f5f5f5',
          },
        }}
      >
        {isFlagged ? (
          <FlagIcon sx={{ color: '#d32f2f' }} fontSize="small" />
        ) : (
          <FlagOutlinedIcon sx={{ color: '#bbb' }} fontSize="small" />
        )}
      </IconButton>
    </Box>
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
  const [flagged, setFlagged] = useState<Record<number, boolean>>({})
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({})
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
  const [sections, setSections] = useState<{ id: number; name: string; code: string }[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)

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

        // Fetch sections
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .select('id, name, code')
        if (sectionError) throw sectionError
        setSections(sectionData || [])

        // Fetch questions with section_id
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)

        if (questionError) throw questionError

        const parsed: Question[] = (questionData ?? []).map((q: any) => {
          let correctRaw = q.correct_answers
          if (typeof correctRaw === 'string') {
            try {
              correctRaw = JSON.parse(correctRaw)
            } catch {
              correctRaw = [correctRaw]
            }
          }
          if (!Array.isArray(correctRaw)) {
            correctRaw = [correctRaw]
          }
          const correct = correctRaw.map((s: string) => (s ?? '').toString().trim().toLowerCase())
          let raw: any[] = []
          if (typeof q.options === 'string') {
            try {
              raw = JSON.parse(q.options)
            } catch {
              raw = []
            }
          } else if (Array.isArray(q.options)) {
            raw = q.options
          } else {
            raw = []
          }
          const opts =
            typeof raw[0] === 'string'
              ? raw.map((t: string) => ({ text: t.trim(), isCorrect: correct.includes(t.trim().toLowerCase()) }))
              : raw.map((o: any) => ({ text: o.text.trim(), isCorrect: correct.includes(o.text.trim().toLowerCase()) }))
          return { 
            id: q.id, 
            question_text: q.question_text, 
            options: opts, 
            section_id: q.section_id,
            marks: q.marks || 1,
            question_type: q.question_type || 'multi'
          }
        })

        setQuiz(quizData)
        setQuestions(parsed)

        // Initialize flagged questions from localStorage
        const savedFlags = localStorage.getItem(`quiz-${quizId}-flags`)
        if (savedFlags) {
          setFlagged(JSON.parse(savedFlags))
        }

        // Initialize bookmarked questions from localStorage
        const savedBookmarks = localStorage.getItem(`quiz-${quizId}-bookmarks`)
        if (savedBookmarks) {
          setBookmarked(JSON.parse(savedBookmarks))
        }

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

  // Save flagged questions to localStorage
  useEffect(() => {
    if (quizId && Object.keys(flagged).length > 0) {
      localStorage.setItem(`quiz-${quizId}-flags`, JSON.stringify(flagged))
    }
  }, [flagged, quizId])

  // Save bookmarked questions to localStorage
  useEffect(() => {
    if (quizId && Object.keys(bookmarked).length > 0) {
      localStorage.setItem(`quiz-${quizId}-bookmarks`, JSON.stringify(bookmarked))
    }
  }, [bookmarked, quizId])

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

  const toggleFlag = useCallback((qid: number) => {
    setFlagged(prev => ({
      ...prev,
      [qid]: !prev[qid]
    }))
  }, [])

  const toggleBookmark = useCallback((qid: number) => {
    setBookmarked(prev => ({
      ...prev,
      [qid]: !prev[qid]
    }))
  }, [])

  const handleCheckboxChange = useCallback((qid: number, opt: string) => {
    setAnswers(prev => {
      const prevAns = prev[qid] || []
      return {
        ...prev,
        [qid]: prevAns.includes(opt)
          ? prevAns.filter(t => t !== opt)
          : [...prevAns, opt]
      }
    })
  }, [])

  const buildPayload = () => {
    let score = 0
    let totalMarks = 0
    let obtainedMarks = 0
    const userAns: Record<number, string[]> = {}
    const correctMap: Record<number, string[]> = {}

    questions.forEach(qq => {
      const ua = answers[qq.id]?.map(s => s.trim().toLowerCase()) ?? []
      userAns[qq.id] = ua
      const correct = qq.options
        .filter(o => o.isCorrect)
        .map(o => o.text.trim().toLowerCase())
      correctMap[qq.id] = correct
      
      const questionMarks = qq.marks || 1
      totalMarks += questionMarks
      
      if (ua.length === correct.length && ua.every(a => correct.includes(a))) {
        score += 1
        obtainedMarks += questionMarks
      }
    })

    return { userAns, correctMap, score, totalMarks, obtainedMarks }
  }

  const submitToDB = async (payload: {
    userAns: any
    correctMap: any
    score: number
    totalMarks: number
    obtainedMarks: number
  }) => {
    if (!user) {
      setErrorPopup('You must be logged in to submit')
      return { data: null, error: new Error('User not logged in') }
    }

    try {
      console.log('Submitting payload:', payload)

      const { data, error } = await supabase
        .from('attempts')
        .insert([{
          quiz_id: Number(quizId),
          user_id: user.id,
          user_name: user.fullName || 'Unknown User',
          answers: payload.userAns,
          correct_answers: payload.correctMap,
          submitted_at: new Date().toISOString(),
          score: payload.score,
          total_marks: payload.totalMarks,
          obtained_marks: payload.obtainedMarks,
          passing_score: quiz?.passing_score || Math.ceil(payload.totalMarks * 0.6),
        }])
        .select('id')
        .single()

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      console.log('Submission successful:', data)
      return { data, error: null }
    } catch (error) {
      console.error('Full submission error:', error)
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Submission failed')
      }
    }
  }

  const handleSubmitClick = () => setConfirmDialogOpen(true)

  const confirmSubmission = async () => {
    setConfirmDialogOpen(false)

    if (!user) {
      setErrorPopup('You must be logged in to submit')
      return
    }

    if (quiz && attemptCount >= quiz.max_attempts) {
      setErrorPopup('Maximum attempts reached')
      return
    }

    setSubmitted(true)
    setAutoSubmitting(true)

    try {
      const payload = buildPayload()
      console.log('Attempting submission with payload:', payload)

      const { data, error } = await submitToDB(payload)

      if (error) {
        console.error('Submission failed with error:', error)
        setErrorPopup(`Submission failed: ${error.message}`)
        setSubmitted(false)
        return
      }

      if (!data) {
        console.error('Submission failed - no data returned')
        setErrorPopup('Submission failed - please try again')
        setSubmitted(false)
        return
      }

      console.log('Submission successful, redirecting to result:', data.id)
      router.push(`/result/${data.id}`)
    } catch (error) {
      console.error('Unexpected submission error:', error)
      setErrorPopup('An unexpected error occurred during submission')
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
      console.log('Auto-submitting with payload:', payload)

      const { data, error } = await submitToDB(payload)

      if (error) {
        console.error('Auto-submission failed:', error)
        setErrorPopup('Auto-submission failed. Please contact support.')
        return
      }

      if (!data) {
        console.error('Auto-submission failed - no data returned')
        setErrorPopup('Auto-submission failed - please contact support.')
        return
      }

      console.log('Auto-submission successful, redirecting to result:', data.id)
      setTimeout(() => router.push(`/result/${data.id}`), 2000)
    } catch (error) {
      console.error('Unexpected auto-submission error:', error)
      setErrorPopup('An error occurred during auto-submission')
    } finally {
      setAutoSubmitting(false)
    }
  }

  // Group questions by section_id
  const questionsBySection = useMemo(() => {
    const map: { [sectionId: number]: Question[] } = {}
    for (const q of questions) {
      if (!map[q.section_id]) map[q.section_id] = []
      map[q.section_id].push(q)
    }
    return map
  }, [questions])

  // Helper to get section name
  const getSectionName = (sectionId: number) => {
    return (
      sections.find(s => s.id === sectionId)?.name || `Section ${sectionId}`
    )
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setFullscreen(false)
      }
    }
  }

  const calculateScore = () => {
    const payload = buildPayload()
    return {
      score: payload.score,
      total: questions.length,
      percentage: Math.round((payload.obtainedMarks / payload.totalMarks) * 100),
      passed: payload.obtainedMarks >= (quiz?.passing_score || Math.ceil(payload.totalMarks * 0.6))
    }
  }

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

  if (errorPopup) {
    return <ErrorPopup message={errorPopup} onClose={() => setErrorPopup(null)} />
  }

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecf3 100%)',
        p: fullscreen ? 0 : 3,
        transition: 'padding 0.3s ease',
      }}>
        <Container maxWidth="xl" sx={{
          py: fullscreen ? 0 : 4,
          height: fullscreen ? '100vh' : 'auto',
          overflow: fullscreen ? 'auto' : 'visible',
          borderRadius: 3,
          boxShadow: 4,
          bgcolor: 'background.paper',
        }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ height: '100%' }}>
            {/* Left Navigator */}
            <Paper
              elevation={fullscreen ? 0 : 2}
              sx={{
                p: 2,
                borderRadius: fullscreen ? 0 : 3,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: fullscreen ? 280 : 320,
                height: fullscreen ? '100vh' : 'auto',
                boxShadow: fullscreen ? 'none' : 2,
                border: '1px solid #d1d5db',
                overflowY: 'auto',
                position: fullscreen ? 'fixed' : 'static',
                left: 0,
                top: 0,
                zIndex: fullscreen ? 1200 : 'auto',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                  Quiz Navigation
                </Typography>
                <Box>
                  <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    <IconButton onClick={toggleFullscreen} size="small">
                      {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Help">
                    <IconButton onClick={() => setShowHelp(!showHelp)} size="small">
                      <HelpOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {showHelp && (
                <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 700, color: '#222' }}>
                    Navigation Guide
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 28, height: 28, bgcolor: NAV_COLORS.attempted, color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, border: `1.5px solid ${NAV_COLORS.borderAttempted}` }}>1</Box>
                      <Typography variant="caption" color="#222">Attempted</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 28, height: 28, bgcolor: NAV_COLORS.unattempted, color: '#222', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, border: `1.5px solid ${NAV_COLORS.borderUnattempted}` }}>2</Box>
                      <Typography variant="caption" color="#222">Unattempted</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 28, height: 28, bgcolor: NAV_COLORS.current, color: '#222', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, border: `2px solid ${NAV_COLORS.borderCurrent}` }}>3</Box>
                      <Typography variant="caption" color="#222">Current</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 28, height: 28, bgcolor: NAV_COLORS.unattempted, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #d32f2f' }}>
                        <FlagIcon sx={{ color: '#d32f2f', fontSize: 18 }} />
                      </Box>
                      <Typography variant="caption" color="#222">Flagged</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 28, height: 28, bgcolor: NAV_COLORS.bookmarked, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${NAV_COLORS.borderBookmarked}` }}>
                        <BookmarkIcon sx={{ color: '#e6b800', fontSize: 18 }} />
                      </Box>
                      <Typography variant="caption" color="#222">Bookmarked</Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {/* Section navigation */}
              {Object.entries(questionsBySection).map(([sectionId, qs], sidx) => (
                <Box key={sectionId} mb={2}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                    {getSectionName(Number(sectionId))}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {qs.map((q, idx) => {
                      const globalIdx = questions.findIndex(qq => qq.id === q.id)
                      return (
                        <QuestionButton
                          key={q.id}
                          idx={globalIdx}
                          current={current}
                          answers={answers}
                          flagged={flagged}
                          questions={questions}
                          setCurrent={setCurrent}
                          submitted={submitted}
                          toggleFlag={toggleFlag}
                          bookmarked={bookmarked}
                        />
                      )
                    })}
                  </Box>
                </Box>
              ))}

              <Box mt="auto">
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Answered: {answeredCount}/{questions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Flagged: {Object.values(flagged).filter(Boolean).length}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="inherit"
                  onClick={handleSubmitClick}
                  disabled={submitted || timeLeft === 0}
                  sx={{ 
                    textTransform: 'none', 
                    fontSize: '0.95rem', 
                    py: 1.5, 
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                  startIcon={<CheckCircleIcon />}
                >
                  Submit Quiz
                </Button>
              </Box>
            </Paper>

            {/* Right Main Quiz */}
            <Box flex={1} sx={{ 
              pl: fullscreen ? '300px' : 0,
              transition: 'padding 0.3s ease',
            }}>
              <Stack spacing={3} sx={{ height: '100%' }}>
                {/* Header */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3, boxShadow: 4, border: '1px solid #d1d5db', bgcolor: 'white' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5" fontWeight={800} color="text.primary">
                      {quiz.quiz_title ?? quiz.quiz_name ?? 'Untitled Quiz'}
                    </Typography>
                    <Chip
                      icon={<TimerIcon />}
                      label={formatTime(timeLeft ?? 0)}
                      variant="filled"
                      sx={{ fontWeight: 700, fontSize: '1.1rem', px: 2, py: 1, borderRadius: 2, bgcolor: '#444', color: '#fff' }}
                    />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </Paper>

                {/* Question Navigation */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={500}>
                    Question {current + 1} of {questions.length}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setCurrent(Math.max(0, current - 1))}
                      disabled={current === 0 || submitted}
                      startIcon={<BackIcon />}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))}
                      disabled={current === questions.length - 1 || submitted}
                      endIcon={<NextIcon />}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>

                {/* Section-wise Questions */}
                {(() => {
                  const currentQuestion = questions[current]
                  const currentSectionId = currentQuestion?.section_id
                  const sectionQuestions = questionsBySection[currentSectionId] || []
                  const sectionName = getSectionName(currentSectionId)
                  const sectionIndex = sectionQuestions.findIndex(q => q.id === currentQuestion.id)
                  const questionMarks = currentQuestion?.marks || 1

                  return (
                    <Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" fontWeight={700} color="text.secondary">
                          {sectionName}
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Tooltip title={flagged[currentQuestion.id] ? 'Unflag question' : 'Flag question'}>
                            <IconButton
                              size="small"
                              onClick={() => toggleFlag(currentQuestion.id)}
                              color={flagged[currentQuestion.id] ? 'error' : 'inherit'}
                            >
                              {flagged[currentQuestion.id] ? <FlagIcon /> : <FlagOutlinedIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={bookmarked[currentQuestion.id] ? 'Remove bookmark' : 'Bookmark question'}>
                            <IconButton
                              size="small"
                              onClick={() => toggleBookmark(currentQuestion.id)}
                              color={bookmarked[currentQuestion.id] ? 'warning' : 'inherit'}
                            >
                              {bookmarked[currentQuestion.id] ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                            </IconButton>
                          </Tooltip>
                          {questionMarks > 0 && (
                            <Chip
                              label={`${questionMarks} mark${questionMarks > 1 ? 's' : ''}`}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>

                      <Card sx={{
                        borderRadius: 3,
                        boxShadow: 3,
                        background: 'white',
                        borderLeft: '4px solid',
                        borderColor: flagged[currentQuestion.id] ? 'error.main' : 'text.primary',
                        mb: 2,
                      }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={700} mb={2} color="text.primary">
                            Q{sectionIndex + 1}. {currentQuestion.question_text}
                          </Typography>
                          {currentQuestion.question_type === 'single' ? (
                            <RadioGroup
                              value={answers[currentQuestion.id]?.[0] || ''}
                              onChange={e => handleCheckboxChange(currentQuestion.id, e.target.value)}
                            >
                              {currentQuestion.options.map((opt, i) => (
                                <FormControlLabel
                                  key={i}
                                  value={opt.text}
                                  control={<Radio disabled={submitted} />}
                                  label={
                                    <Box sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      textDecoration: submitted && opt.isCorrect ? 'underline' : 'none',
                                      color: submitted && opt.isCorrect ? 'success.main' : 'text.primary',
                                    }}>
                                      {opt.text}
                                      {submitted && opt.isCorrect && (
                                        <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                                      )}
                                    </Box>
                                  }
                                  sx={{
                                    alignItems: 'flex-start',
                                    mb: 1,
                                    bgcolor:
                                      submitted && answers[currentQuestion.id]?.includes(opt.text) && !opt.isCorrect
                                        ? 'error.light'
                                        : 'transparent',
                                    borderRadius: 1,
                                    p:
                                      submitted && answers[currentQuestion.id]?.includes(opt.text) && !opt.isCorrect
                                        ? 1
                                        : 0,
                                  }}
                                />
                              ))}
                            </RadioGroup>
                          ) : (
                            <FormGroup>
                              {currentQuestion.options.map((opt, i) => (
                                <FormControlLabel
                                  key={i}
                                  control={
                                    <Checkbox
                                      checked={answers[currentQuestion.id]?.includes(opt.text) || false}
                                      onChange={() => handleCheckboxChange(currentQuestion.id, opt.text)}
                                      disabled={submitted}
                                    />
                                  }
                                  label={
                                    <Box sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      textDecoration: submitted && opt.isCorrect ? 'underline' : 'none',
                                      color: submitted && opt.isCorrect ? 'success.main' : 'text.primary',
                                    }}>
                                      {opt.text}
                                      {submitted && opt.isCorrect && (
                                        <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                                      )}
                                    </Box>
                                  }
                                  sx={{
                                    alignItems: 'flex-start',
                                    mb: 1,
                                    bgcolor:
                                      submitted && answers[currentQuestion.id]?.includes(opt.text) && !opt.isCorrect
                                        ? 'error.light'
                                        : 'transparent',
                                    borderRadius: 1,
                                    p:
                                      submitted && answers[currentQuestion.id]?.includes(opt.text) && !opt.isCorrect
                                        ? 1
                                        : 0,
                                  }}
                                />
                              ))}
                            </FormGroup>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  )
                })()}

                {/* Bottom Navigation */}
                <Box display="flex" justifyContent="space-between" mt="auto">
                  <Button
                    variant="outlined"
                    onClick={() => setCurrent(Math.max(0, current - 1))}
                    disabled={current === 0 || submitted}
                    startIcon={<BackIcon />}
                    sx={{ borderRadius: '8px' }}
                  >
                    Previous Question
                  </Button>
                  {current < questions.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))}
                      disabled={submitted}
                      endIcon={<NextIcon />}
                      sx={{ borderRadius: '8px' }}
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="inherit"
                      onClick={handleSubmitClick}
                      disabled={submitted || timeLeft === 0}
                      endIcon={<CheckCircleIcon />}
                      sx={{ borderRadius: '8px' }}
                    >
                      {submitted ? 'Submitted' : 'Submit Quiz'}
                    </Button>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Container>

        {/* Dialogs */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Submit Quiz</DialogTitle>
          <DialogContent>
            <Divider sx={{ mb: 2 }} />
            <DialogContentText>
              You answered {answeredCount} out of {questions.length} questions.
            </DialogContentText>
            {answeredCount < questions.length && (
              <DialogContentText color="error" sx={{ mt: 1 }}>
                You have {questions.length - answeredCount} unanswered questions.
              </DialogContentText>
            )}
            {/* Show flagged and bookmarked questions */}
            {Object.values(flagged).filter(Boolean).length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="warning.main" fontWeight={600} mb={0.5}>Flagged Questions:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
                  {questions
                    .map((q, idx) => ({ ...q, idx }))
                    .filter(q => flagged[q.id])
                    .map(q => (
                      <Chip
                        key={q.id}
                        label={`Q${q.idx + 1} (${getSectionName(q.section_id)})`}
                        color="warning"
                        variant="outlined"
                      />
                    ))}
                </Stack>
              </Box>
            )}
            {Object.values(bookmarked).filter(Boolean).length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="info.main" fontWeight={600} mb={0.5}>Bookmarked Questions:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
                  {questions
                    .map((q, idx) => ({ ...q, idx }))
                    .filter(q => bookmarked[q.id])
                    .map(q => (
                      <Chip
                        key={q.id}
                        label={`Q${q.idx + 1} (${getSectionName(q.section_id)})`}
                        color="info"
                        variant="outlined"
                      />
                    ))}
                </Stack>
              </Box>
            )}
            {/* Optionally show pass/fail status only */}
            {quiz.passing_score && (
              <Box mt={2}>
                <Typography variant="body2" color={calculateScore().passed ? 'success.main' : 'error.main'}>
                  {calculateScore().passed ? 'Likely to pass' : 'Not passing yet'}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} color="secondary">
              Continue Quiz
            </Button>
            <Button onClick={confirmSubmission} variant="contained" autoFocus>
              Confirm Submit
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={timeUpDialogOpen} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon color="error" />
            ⏰ Time's Up
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              The quiz time has ended. Your answers are being auto-submitted.
            </DialogContentText>
            {autoSubmitting && (
              <Box mt={3} display="flex" flexDirection="column" alignItems="center">
                <CircularProgress size={48} thickness={4} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Please wait while we process your submission...
                </Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </motion.div>
  )
}