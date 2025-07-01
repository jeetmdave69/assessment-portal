'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
  Alert,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge,
  Fab,
  Collapse,
  Snackbar
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
  Dashboard as DashboardIcon,
  Book as BookIcon,
  BarChart as BarChartIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Palette as PaletteIcon,
  TextFields as TextFieldsIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material'
import debounce from 'lodash.debounce'

// Types
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
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}
interface Quiz {
  id: number
  quiz_title?: string
  quiz_name?: string
  duration: number
  max_attempts: number
  passing_score?: number
  show_answers?: boolean
  start_time?: string
  end_time?: string
}
interface Section {
  id: number
  name: string
  description?: string
  instructions?: string
  marks?: number
}

// Constants
const THEMES = {
  default: {
    primary: '#002366',
    secondary: '#e3e6ef',
    text: '#212121',
    background: '#f7f9fa'
  },
  dark: {
    primary: '#002366',
    secondary: '#222',
    text: '#fff',
    background: '#181c24'
  },
  sepia: {
    primary: '#002366',
    secondary: '#e3e6ef',
    text: '#212121',
    background: '#f7f9fa'
  }
}

// Add navigation and difficulty color constants
const NAV_COLORS = {
  attempted: '#1976d2', // Blue for answered
  unattempted: '#e0e0e0', // Light gray for unanswered
  current: '#002366', // Deep blue for current
  flagged: '#f44336', // Red for flagged
  bookmarked: '#ffb300', // Amber for bookmarked
  markedForReview: '#7b1fa2', // Purple for review
  borderAttempted: '#1565c0',
  borderUnattempted: '#bdbdbd',
  borderCurrent: '#002366',
  borderMarkedForReview: '#7b1fa2',
  borderBookmarked: '#ffb300'
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#43a047',      // Green
  medium: '#ffa000',    // Amber
  hard: '#d32f2f'       // Red
}

const QuestionButton = ({
  q,
  idx,
  isCurrent,
  isAnswered,
  isFlagged,
  isBookmarked,
  isMarkedForReview,
  onClick,
  disabled
}: {
  q: Question
  idx: number
  isCurrent: boolean
  isAnswered: boolean
  isFlagged: boolean
  isBookmarked: boolean
  isMarkedForReview: boolean
  onClick: () => void
  disabled: boolean
}) => {
  // Determine color scheme
  let bgcolor = NAV_COLORS.unattempted
  let color = '#212121'
  let border = `1px solid ${NAV_COLORS.borderUnattempted}`
  
  if (isCurrent) {
    bgcolor = NAV_COLORS.current
    border = `2px solid ${NAV_COLORS.borderCurrent}`
    color = '#ffffff'
  } else if (isMarkedForReview) {
    bgcolor = NAV_COLORS.markedForReview
    border = `1px solid ${NAV_COLORS.borderMarkedForReview}`
    color = '#ffffff'
  } else if (isBookmarked) {
    bgcolor = NAV_COLORS.bookmarked
    border = `1px solid ${NAV_COLORS.borderBookmarked}`
  } else if (isAnswered) {
    bgcolor = NAV_COLORS.attempted
    border = `1px solid ${NAV_COLORS.borderAttempted}`
    color = '#ffffff'
  } else if (isFlagged) {
    bgcolor = NAV_COLORS.flagged
    border = `1px solid ${NAV_COLORS.borderUnattempted}`
    color = '#ffffff'
  }

  return (
    <Box position="relative" sx={{ display: 'inline-block', m: 0.5 }}>
      <Button
        size="small"
        variant="contained"
        sx={{
          minWidth: 36,
          minHeight: 36,
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontWeight: isCurrent ? 700 : 500,
          boxShadow: isCurrent ? 2 : 0,
          border,
          bgcolor,
          color: isAnswered ? 'primary' : 'inherit',
          transition: 'all 0.2s',
          p: 0,
          '&:hover': {
            transform: 'scale(1.05)'
          }
        }}
        onClick={onClick}
        disabled={disabled}
      >
        {idx + 1}
      </Button>
      {isFlagged && (
        <FlagIcon sx={{
          position: 'absolute',
          top: -6,
          right: -6,
          color: '#f44336',
          fontSize: '0.75rem'
        }} />
      )}
    </Box>
  )
}

export default function AttemptQuizPage() {
  const params = useParams() as { quizId?: string } | null
  const quizId = params?.quizId
  const router = useRouter()
  const { user } = useUser()

  // State management
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [flagged, setFlagged] = useState<Record<number, boolean>>({})
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({})
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({})
  const [currentSection, setCurrentSection] = useState<number | null>(null)
  const [currentQuestionId, setCurrentQuestionId] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [timeUpDialogOpen, setTimeUpDialogOpen] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [showAnswerKey, setShowAnswerKey] = useState(false)
  const [theme, setTheme] = useState<'default' | 'dark' | 'sepia'>('default')
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal')
  const [showNavigationPanel, setShowNavigationPanel] = useState(true)
  const [showSectionInstructions, setShowSectionInstructions] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)
  const [violationCount, setViolationCount] = useState(0)
  const [submittingModalOpen, setSubmittingModalOpen] = useState(false)
  const [resumeNotification, setResumeNotification] = useState(false)

  // Refs
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize expanded sections
  useEffect(() => {
    if (sections.length > 0) {
      const initialExpanded: Record<number, boolean> = {}
      sections.forEach(section => {
        initialExpanded[section.id] = true
      })
      setExpandedSections(initialExpanded)
    }
  }, [sections])

  // Toggle section expansion
  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Fetch quiz data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()
        console.log('quizData:', quizData, 'quizError:', quizError);
        if (quizError) throw quizError
        if (!quizData) throw new Error('Quiz not found')
        setQuiz(quizData)

        // Fetch sections for this quiz
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .select('*')
          .eq('quiz_id', quizId)
          .order('id', { ascending: true })
        if (sectionError) throw sectionError
        setSections(sectionData || [])

        // Fetch questions
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('id', { ascending: true })
        console.log('questionData:', questionData, 'questionError:', questionError);
        if (questionError) throw questionError

        const parsedQuestions = (questionData || []).map(q => ({
          id: q.id,
          question_text: q.question_text,
          options: q.options.map((opt: any) => ({
            text: opt.text,
            isCorrect: opt.is_correct
          })),
          section_id: q.section_id,
          marks: q.marks || 1,
          question_type: q.question_type || 'single',
          explanation: q.explanation,
          difficulty: q.difficulty || 'medium'
        }))

        setQuestions(parsedQuestions)

        // Initialize time (persistent timer)
        const durationInSeconds = (quizData.duration || 30) * 60
        setTotalTime(durationInSeconds)
        let startTime = localStorage.getItem(`quiz-${quizId}-startTime`)
        if (!startTime) {
          startTime = Date.now().toString()
          localStorage.setItem(`quiz-${quizId}-startTime`, startTime)
        }
        const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000)
        const remaining = durationInSeconds - elapsed
        setTimeLeft(remaining > 0 ? remaining : 0)

        // Load saved state
        const savedState = localStorage.getItem(`quiz-${quizId}-state`)
        if (savedState) {
          const { answers, flags, bookmarks, reviews } = JSON.parse(savedState)
          setAnswers(answers || {})
          setFlagged(flags || {})
          setBookmarked(bookmarks || {})
          setMarkedForReview(reviews || {})
        }

        if ((sectionData || []).length > 0) {
          setCurrentSection(sectionData[0].id)
        }
      } catch (error) {
        console.error('Error loading quiz:', error, JSON.stringify(error, null, 2));
        setErrorPopup('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false)
      }
    }

    if (quizId) fetchData()
  }, [quizId])

  // Group questions by section_id
  const questionsBySection = useMemo(() => {
    const groups: Record<number, Question[]> = {}
    questions.forEach(q => {
      if (!groups[q.section_id]) groups[q.section_id] = []
      groups[q.section_id].push(q)
    })
    return groups
  }, [questions])

  // Get current question
  const currentQuestion = useMemo(() => {
    return questions.find(q => q.id === currentQuestionId) || questions[0]
  }, [currentQuestionId, questions])

  // Calculate answered count
  const answeredCount = useMemo(() => {
    return Object.keys(answers).length
  }, [answers])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer progress
  const timerProgress = useMemo(() => {
    if (timeLeft === null || totalTime === 0) return 0
    return ((totalTime - timeLeft) / totalTime) * 100
  }, [timeLeft, totalTime])

  // Current theme
  const currentTheme = THEMES[theme]
  const fontSizeStyles = {
    normal: { fontSize: '1rem' },
    large: { fontSize: '1.2rem' },
    xlarge: { fontSize: '1.4rem' }
  }

  // Navigation handlers
  const goToQuestion = (questionId: number) => {
    setCurrentQuestionId(questionId);
    // Find the section of the selected question
    const q = questions.find(q => q.id === questionId);
    if (q) setCurrentSection(q.section_id);
    questionRefs.current[questionId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  const goToNextQuestionFlat = () => {
    const idx = questions.findIndex(q => q.id === currentQuestionId);
    if (idx < questions.length - 1) {
      const nextQ = questions[idx + 1];
      setCurrentQuestionId(nextQ.id);
      setCurrentSection(nextQ.section_id);
    }
  };

  const goToPrevQuestionFlat = () => {
    const idx = questions.findIndex(q => q.id === currentQuestionId);
    if (idx > 0) {
      const prevQ = questions[idx - 1];
      setCurrentQuestionId(prevQ.id);
      setCurrentSection(prevQ.section_id);
    }
  };

  // Add handler for Next Section
  const goToNextSection = () => {
    const sectionIds = sections.map(s => s.id);
    const currentSectionIndex = sectionIds.indexOf(currentSection ?? -1);
    if (currentSectionIndex < sectionIds.length - 1) {
      const nextSectionId = sectionIds[currentSectionIndex + 1];
      const nextSectionQuestions = questionsBySection[nextSectionId] || [];
      if (nextSectionQuestions.length > 0) {
        setCurrentSection(nextSectionId);
        setCurrentQuestionId(nextSectionQuestions[0].id);
      }
    }
  };

  // Answer handlers
  const handleOptionSelect = (questionId: number, optionText: string, questionType: string) => {
    setAnswers(prev => {
      if (questionType === 'single') {
        return { ...prev, [questionId]: [optionText] }
      } else {
        const currentAnswers = prev[questionId] || []
        return {
          ...prev,
          [questionId]: currentAnswers.includes(optionText)
            ? currentAnswers.filter(a => a !== optionText)
            : [...currentAnswers, optionText]
        }
      }
    })
  }

  // Flag and bookmark handlers
  const toggleFlag = (questionId: number) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const toggleBookmark = (questionId: number) => {
    setBookmarked(prev => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error)
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  // Submit handlers
  const handleSubmit = async () => {
    setConfirmDialogOpen(true)
  }

  // Security: Tab/Window Switch & Fullscreen Exit Detection
  useEffect(() => {
    const handleVisibility = (e: Event) => {
      if (document.visibilityState === 'hidden') {
        setViolationCount((prev) => {
          const next = prev + 1;
          setErrorPopup('You switched tabs/windows. This is not allowed during the exam.');
          if (next >= 3 && !submitted) {
            handleSubmit();
          }
          return next;
        });
      }
    };
    const handleFullscreenChange = (e: Event) => {
      if (!document.fullscreenElement) {
        setViolationCount((prev) => {
          const next = prev + 1;
          setErrorPopup('You exited fullscreen. Please return to fullscreen.');
          if (next >= 3 && !submitted) {
            handleSubmit();
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [submitted]);

  // Security: Prevent right-click, copy, cut, paste, and print
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const preventKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      // Prevent Print
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('keydown', preventKey);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('keydown', preventKey);
    };
  }, []);

  // Restore progress from server on mount
  useEffect(() => {
    if (!quizId || !user?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/quiz-progress?quiz_id=${quizId}&user_id=${user.id}`);
        const { data } = await res.json();
        if (data) {
          // Restore server progress
          setAnswers(data.answers || {});
          setFlagged(data.flagged || {});
          setBookmarked(data.bookmarked || {});
          setMarkedForReview(data.marked_for_review || {});
          if (data.start_time) {
            localStorage.setItem(`quiz-${quizId}-startTime`, new Date(data.start_time).getTime().toString());
          }
          // Set current question to first answered or first question
          const answeredQ = Object.keys(data.answers || {});
          if (answeredQ.length > 0) {
            const firstQ = questions.find(q => q.id === Number(answeredQ[0]));
            if (firstQ) {
              setCurrentQuestionId(firstQ.id);
              setCurrentSection(firstQ.section_id);
            }
          }
          setResumeNotification(true);
        }
      } catch (e) {
        // Ignore fetch errors
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, user?.id]);

  // Debounced server auto-save
  const debouncedSaveProgress = useRef(
    debounce(async (progress) => {
      if (!quizId || !user?.id) return;
      await fetch('/api/quiz-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          user_id: user.id,
          answers: progress.answers,
          flagged: progress.flagged,
          bookmarked: progress.bookmarked,
          marked_for_review: progress.markedForReview,
          start_time: localStorage.getItem(`quiz-${quizId}-startTime`) ? new Date(Number(localStorage.getItem(`quiz-${quizId}-startTime`))).toISOString() : undefined,
        })
      });
    }, 5000)
  ).current;

  // Watch for changes and auto-save
  useEffect(() => {
    debouncedSaveProgress({ answers, flagged, bookmarked, markedForReview });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, flagged, bookmarked, markedForReview, currentQuestionId]);

  // Backend validation: On submission, check time and attempt count
  const confirmSubmit = async () => {
    setConfirmDialogOpen(false)
    setSubmittingModalOpen(true)
    setSubmitted(true)
    try {
      // Prepare correct answers
      const correctAnswers: Record<number, string[]> = {}
      questions.forEach(q => {
        correctAnswers[q.id] = q.options.filter(o => o.isCorrect).map(o => o.text)
      })
      // Calculate extra fields
      const totalQuestions = questions.length;
      const scoreObj = calculateScore();
      const correctCount = scoreObj.score;
      const percentage = scoreObj.percentage;
      const status = 1;
      // Backend validation: Check time and attempt count
      // Fetch latest attempt count and quiz start time from DB
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select('id,submitted_at')
        .eq('quiz_id', Number(quizId))
        .eq('user_id', user?.id);
      if (attemptsError) throw attemptsError;
      if (attemptsData && attemptsData.length >= (quiz?.max_attempts || 1)) {
        setErrorPopup('You have reached the maximum number of attempts for this quiz.');
        setSubmitted(false);
        return;
      }
      // Check time (server-side)
      const now = new Date();
      const quizStart = quiz?.start_time ? new Date(quiz.start_time) : null;
      const quizEnd = quiz?.end_time ? new Date(quiz.end_time) : null;
      if (quizStart && now < quizStart) {
        setErrorPopup('Quiz has not started yet.');
        setSubmitted(false);
        return;
      }
      if (quizEnd && now > quizEnd) {
        setErrorPopup('Quiz time is over.');
        setSubmitted(false);
        return;
      }
      // Prepare submission data
      const submissionData = {
        quiz_id: Number(quizId),
        user_id: user?.id,
        user_name: user?.fullName || 'Anonymous',
        answers,
        correct_answers: correctAnswers,
        submitted_at: new Date().toISOString(),
        score: correctCount,
        total_questions: totalQuestions,
        correct_count: correctCount,
        percentage,
        status,
        marked_for_review: markedForReview
      }
      // Save to database
      const { error } = await supabase
        .from('attempts')
        .insert([submissionData])
      if (error) throw error
      // After successful submission, delete progress
      await fetch('/api/quiz-progress', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, user_id: user?.id })
      });
      setRedirectMessage('Quiz submitted! Redirecting to dashboard...')
      setTimeout(() => {
        setSubmittingModalOpen(false)
        router.push('/dashboard/student')
      }, 3500)
    } catch (error) {
      console.error('Submission error:', JSON.stringify(error, null, 2))
      setErrorPopup('Failed to submit. Please try again.')
      setSubmitted(false)
    }
  }

  // Score calculation
  const calculateScore = () => {
    let score = 0
    let totalMarks = 0
    let obtainedMarks = 0

    questions.forEach(q => {
      const userAnswer = answers[q.id] || []
      const correctAnswers = q.options.filter(o => o.isCorrect).map(o => o.text)
      const questionMarks = q.marks || 1
      totalMarks += questionMarks

      // Check if answer is correct
      if (
        userAnswer.length === correctAnswers.length &&
        userAnswer.every(a => correctAnswers.includes(a))
      ) {
        score += 1
        obtainedMarks += questionMarks
      }
    })

    const percentage = Math.round((obtainedMarks / totalMarks) * 100)
    const passed = quiz?.passing_score ? obtainedMarks >= quiz.passing_score : percentage >= 60

    return { score, totalMarks, obtainedMarks, percentage, passed }
  }

  // Timer countdown effect
  useEffect(() => {
    if (submitted || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      // Always recalculate timeLeft from startTime for robustness
      const startTime = localStorage.getItem(`quiz-${quizId}-startTime`)
      if (startTime) {
        const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000)
        const remaining = totalTime - elapsed
        setTimeLeft(remaining > 0 ? remaining : 0)
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, quizId, totalTime]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{
      fontFamily: 'Poppins, sans-serif',
      backgroundColor: currentTheme.background,
      color: currentTheme.text,
      minHeight: '100vh',
      transition: 'background-color 0.3s, color 0.3s',
      // Disable text selection for exam security
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
    }}>
      {/* Header */}
      <Box sx={{
        backgroundColor: currentTheme.primary,
        color: '#ffffff',
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 2
      }}>
        <Typography variant="h5" fontWeight="bold">
          {quiz?.quiz_title || 'Exam'}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{
            backgroundColor: timeLeft && timeLeft <= 60 ? '#f44336' : currentTheme.primary,
            color: '#ffffff',
            px: 2,
            py: 1,
            borderRadius: 2,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            transition: 'background-color 0.3s'
          }}>
            <TimerIcon />
            <span>{formatTime(timeLeft || 0)}</span>
          </Box>
          
          <IconButton onClick={toggleFullscreen} color="inherit">
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          
          <Avatar src={user?.imageUrl} alt={user?.fullName || 'User'} />
        </Box>
      </Box>

      {/* Main Content */}
      <Box display="flex" sx={{ height: 'calc(100vh - 64px)' }}>
        {/* Navigation Sidebar */}
        <Drawer
          variant="persistent"
          open={showNavigationPanel}
          sx={{
            width: showNavigationPanel ? 320 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              backgroundColor: currentTheme.background,
              borderRight: `1px solid ${currentTheme.secondary}`,
              overflowY: 'auto'
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Question Navigation
              </Typography>
              <IconButton onClick={() => setShowNavigationPanel(false)} size="small">
                <ChevronRightIcon />
              </IconButton>
            </Box>

            <Box display="flex" gap={1} mb={3} flexWrap="wrap">
              <Chip 
                label={`Answered: ${answeredCount}`} 
                size="small" 
                sx={{ 
                  backgroundColor: NAV_COLORS.attempted, 
                  color: '#fff',
                  fontWeight: 'bold'
                }} 
              />
              <Chip 
                label={`Unanswered: ${questions.length - answeredCount}`} 
                size="small" 
                sx={{ 
                  backgroundColor: NAV_COLORS.unattempted,
                  border: `1px solid ${NAV_COLORS.borderUnattempted}`,
                  fontWeight: 'bold'
                }} 
              />
              <Chip 
                label={`Flagged: ${Object.values(flagged).filter(Boolean).length}`} 
                size="small" 
                sx={{ 
                  backgroundColor: NAV_COLORS.flagged, 
                  color: '#fff',
                  fontWeight: 'bold'
                }} 
              />
            </Box>

            {/* Sections with expandable questions */}
            <List sx={{ width: '100%' }}>
              {sections.map((section) => {
                const sectionQuestionsList = questionsBySection[section.id] || []
                const sectionAnswered = sectionQuestionsList.filter((q: Question) => answers[q.id]).length
                const sectionFlagged = sectionQuestionsList.filter((q: Question) => flagged[q.id]).length

                return (
                  <Box key={section.id} sx={{ mb: 1 }}>
                    <ListItem 
                      button 
                      onClick={() => toggleSection(section.id)}
                      sx={{
                        backgroundColor: currentSection === section.id ? `${currentTheme.primary}20` : 'transparent',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: `${currentTheme.primary}10`
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {expandedSections[section.id] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight="bold">
                              {section.name}
                            </Typography>
                            <Box display="flex" gap={1}>
                              <Chip 
                                label={`${sectionAnswered}/${sectionQuestionsList.length}`}
                                size="small"
                                sx={{
                                  backgroundColor: sectionAnswered === sectionQuestionsList.length 
                                    ? NAV_COLORS.attempted 
                                    : sectionAnswered > 0 
                                      ? `${NAV_COLORS.attempted}80`
                                      : NAV_COLORS.unattempted,
                                  color: sectionAnswered === sectionQuestionsList.length || sectionAnswered > 0 
                                    ? '#fff' 
                                    : 'inherit',
                                  fontSize: '0.7rem',
                                  height: 20
                                }}
                              />
                              {sectionFlagged > 0 && (
                                <Chip 
                                  label={sectionFlagged}
                                  size="small"
                                  sx={{
                                    backgroundColor: NAV_COLORS.flagged,
                                    color: '#fff',
                                    fontSize: '0.7rem',
                                    height: 20
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                        secondary={`${sectionQuestionsList.length} Questions | ${section.marks || '?'} Marks`}
                      />
                    </ListItem>

                    <Collapse in={expandedSections[section.id]} timeout="auto" unmountOnExit>
                      <Box sx={{ 
                        pl: 6, 
                        pr: 2, 
                        pt: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5
                      }}>
                        {sectionQuestionsList.map((q: Question, idx: number) => (
                          <QuestionButton
                            key={q.id}
                            q={q}
                            idx={idx}
                            isCurrent={currentQuestionId === q.id}
                            isAnswered={!!answers[q.id]}
                            isFlagged={!!flagged[q.id]}
                            isBookmarked={!!bookmarked[q.id]}
                            isMarkedForReview={!!markedForReview[q.id]}
                            onClick={() => goToQuestion(q.id)}
                            disabled={submitted}
                          />
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )
              })}
            </List>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, fontWeight: 'bold' }}
              onClick={handleSubmit}
              disabled={submitted}
              startIcon={<CheckCircleIcon />}
            >
              Submit Exam
            </Button>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Navigation Legend:
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    backgroundColor: NAV_COLORS.attempted,
                    border: `1px solid ${NAV_COLORS.borderAttempted}`
                  }} />
                  <Typography variant="body2">Answered</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    backgroundColor: NAV_COLORS.unattempted,
                    border: `1px solid ${NAV_COLORS.borderUnattempted}`
                  }} />
                  <Typography variant="body2">Unanswered</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    backgroundColor: NAV_COLORS.current,
                    border: `1px solid ${NAV_COLORS.borderCurrent}`
                  }} />
                  <Typography variant="body2">Current</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    backgroundColor: NAV_COLORS.flagged,
                    border: `1px solid ${NAV_COLORS.borderUnattempted}`,
                    position: 'relative'
                  }}>
                    <FlagIcon sx={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      color: '#f44336',
                      fontSize: '0.75rem'
                    }} />
                  </Box>
                  <Typography variant="body2">Flagged</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    backgroundColor: NAV_COLORS.markedForReview,
                    border: `1px solid ${NAV_COLORS.borderMarkedForReview}`
                  }} />
                  <Typography variant="body2">Marked for Review</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Drawer>

        {/* Question Area */}
        <Box sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 3,
          ...fontSizeStyles[fontSize]
        }}>
          {/* Current Section Header */}
          {sections.filter((s) => s.id === currentSection).map((section) => (
            <Card key={section.id} sx={{ 
              mb: 3,
              backgroundColor: currentTheme.primary,
              color: '#fff',
            }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {section.name}
                </Typography>
                {section.description && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {section.description}
                  </Typography>
                )}
                {section.instructions && showSectionInstructions && (
                  <Box sx={{ 
                    mt: 2,
                    p: 2,
                    backgroundColor: '#ffffff20',
                    borderRadius: 1
                  }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Section Instructions:
                    </Typography>
                    <Typography variant="body2">
                      {section.instructions}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`${questionsBySection[section.id]?.length || 0} Questions`}
                    sx={{ backgroundColor: '#ffffff30', color: '#fff' }}
                  />
                  <Chip 
                    label={`${section.marks || '?'} Marks`}
                    sx={{ backgroundColor: '#ffffff30', color: '#fff' }}
                  />
                  <Chip 
                    label={`${Math.floor((section.marks || 0) / (quiz?.duration || 1))} Min/Question`}
                    sx={{ backgroundColor: '#ffffff30', color: '#fff' }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}

          {/* Render only the current question, not all questions in the current section */}
          {currentQuestion && (
            <Box
              key={currentQuestion.id}
              ref={(el: HTMLDivElement | null) => { questionRefs.current[currentQuestion.id] = el; }}
              id={`question-${currentQuestion.id}`}
              sx={{
                mb: 4,
                p: 3,
                borderRadius: 2,
                backgroundColor: currentTheme.background,
                border: `2px solid ${currentTheme.primary}`,
                boxShadow: 3,
                transition: 'all 0.3s',
                position: 'relative'
              }}
            >
              {/* Question number with section prefix */}
              <Typography variant="subtitle2" sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: currentTheme.primary,
                color: '#fff',
                px: 1,
                borderRadius: 1,
                fontWeight: 'bold'
              }}>
                Q-{questions.findIndex(q => q.id === currentQuestion.id) + 1}
              </Typography>

              {/* Question controls */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ pr: 4 }}>
                    {currentQuestion.question_text}
                  </Typography>
                  {currentQuestion.difficulty && (
                    <Chip 
                      label={currentQuestion.difficulty} 
                      size="small" 
                      sx={{ 
                        mt: 1,
                        backgroundColor: DIFFICULTY_COLORS[currentQuestion.difficulty],
                        color: '#fff',
                        fontWeight: 'bold'
                      }} 
                    />
                  )}
                </Box>
                
                <Box display="flex" gap={1}>
                  <Tooltip title="Flag question">
                    <IconButton 
                      onClick={() => toggleFlag(currentQuestion.id)} 
                      size="small"
                      sx={{
                        backgroundColor: flagged[currentQuestion.id] ? `${NAV_COLORS.flagged}20` : 'transparent',
                        '&:hover': {
                          backgroundColor: `${NAV_COLORS.flagged}10`
                        }
                      }}
                    >
                      <FlagIcon color={flagged[currentQuestion.id] ? 'error' : 'inherit'} />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Bookmark">
                    <IconButton 
                      onClick={() => toggleBookmark(currentQuestion.id)} 
                      size="small"
                      sx={{
                        backgroundColor: bookmarked[currentQuestion.id] ? `${NAV_COLORS.bookmarked}20` : 'transparent',
                        '&:hover': {
                          backgroundColor: `${NAV_COLORS.bookmarked}10`
                        }
                      }}
                    >
                      {bookmarked[currentQuestion.id] ? (
                        <BookmarkIcon color="warning" />
                      ) : (
                        <BookmarkBorderIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Mark for review">
                    <IconButton 
                      onClick={() => toggleMarkForReview(currentQuestion.id)} 
                      size="small"
                      sx={{
                        backgroundColor: markedForReview[currentQuestion.id] ? `${NAV_COLORS.markedForReview}20` : 'transparent',
                        '&:hover': {
                          backgroundColor: `${NAV_COLORS.markedForReview}10`
                        }
                      }}
                    >
                      <VisibilityIcon color={markedForReview[currentQuestion.id] ? 'secondary' : 'inherit'} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              {/* Question options */}
              {currentQuestion.question_type === 'single' ? (
                <RadioGroup
                  value={answers[currentQuestion.id]?.[0] || ''}
                  onChange={(e) => handleOptionSelect(currentQuestion.id, e.target.value, currentQuestion.question_type)}
                >
                  {currentQuestion.options.map((opt: Option, optIdx: number) => (
                    <FormControlLabel
                      key={optIdx}
                      value={opt.text}
                      control={<Radio color="primary" />}
                      label={opt.text}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: answers[currentQuestion.id]?.includes(opt.text) 
                          ? `${currentTheme.primary}20` 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: `${currentTheme.primary}10`
                        }
                      }}
                      disabled={submitted}
                    />
                  ))}
                </RadioGroup>
              ) : (
                <FormGroup>
                  {currentQuestion.options.map((opt: Option, optIdx: number) => (
                    <FormControlLabel
                      key={optIdx}
                      control={
                        <Checkbox
                          checked={answers[currentQuestion.id]?.includes(opt.text) || false}
                          onChange={() => handleOptionSelect(currentQuestion.id, opt.text, currentQuestion.question_type)}
                          color="primary"
                        />
                      }
                      label={opt.text}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: answers[currentQuestion.id]?.includes(opt.text) 
                          ? `${currentTheme.primary}20` 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: `${currentTheme.primary}10`
                        }
                      }}
                      disabled={submitted}
                    />
                  ))}
                </FormGroup>
              )}
              
              {/* Marks indicator */}
              <Typography variant="caption" sx={{
                display: 'block',
                mt: 2,
                textAlign: 'right',
                fontStyle: 'italic',
                fontWeight: 'bold'
              }}>
                Marks: {currentQuestion.marks || 1}
              </Typography>

              {/* Explanation (visible in review mode or if showAnswerKey is true) */}
              {(reviewMode || showAnswerKey) && currentQuestion.explanation && (
                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: 1,
                  borderLeft: '4px solid #4caf50'
                }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32">
                    Explanation:
                  </Typography>
                  <Typography variant="body2" color="#2e7d32">
                    {currentQuestion.explanation}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Section navigation buttons */}
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              variant="contained"
              startIcon={<BackIcon />}
              onClick={goToPrevQuestionFlat}
              disabled={questions.findIndex(q => q.id === currentQuestionId) === 0}
              sx={{ fontWeight: 'bold' }}
            >
              Previous Question
            </Button>
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={goToNextQuestionFlat}
              disabled={questions.findIndex(q => q.id === currentQuestionId) === questions.length - 1}
              sx={{ fontWeight: 'bold' }}
            >
              Next Question
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Floating Action Buttons */}
      {!showNavigationPanel && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1000
          }}
          onClick={() => setShowNavigationPanel(true)}
        >
          <VisibilityIcon />
        </Fab>
      )}
      
      <Fab
        color="secondary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setSidebarOpen(true)}
      >
        <SettingsIcon />
      </Fab>

      {/* Settings Panel */}
      <Drawer
        anchor="right"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <Box sx={{ width: 300, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Exam Settings
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Theme
          </Typography>
          <RadioGroup
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
          >
            <FormControlLabel 
              value="default" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: THEMES.default.primary
                  }} />
                  <span>Default</span>
                </Box>
              } 
            />
            <FormControlLabel 
              value="dark" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: THEMES.dark.primary
                  }} />
                  <span>Dark</span>
                </Box>
              } 
            />
            <FormControlLabel 
              value="sepia" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: THEMES.sepia.primary
                  }} />
                  <span>Sepia</span>
                </Box>
              } 
            />
          </RadioGroup>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Font Size
          </Typography>
          <RadioGroup
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value as any)}
          >
            <FormControlLabel value="normal" control={<Radio />} label="Normal" />
            <FormControlLabel value="large" control={<Radio />} label="Large (+20%)" />
            <FormControlLabel value="xlarge" control={<Radio />} label="Extra Large (+40%)" />
          </RadioGroup>
          
          <Divider sx={{ my: 2 }} />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={showSectionInstructions}
                onChange={(e) => setShowSectionInstructions(e.target.checked)}
              />
            }
            label="Show Section Instructions"
          />
          
          {quiz?.show_answers && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={showAnswerKey}
                  onChange={(e) => setShowAnswerKey(e.target.checked)}
                />
              }
              label="Show Answer Key"
            />
          )}
        </Box>
      </Drawer>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Submit Exam?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to submit your exam? You won't be able to make changes after submission.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Summary:</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Chip label={`Answered: ${answeredCount}`} color="success" variant="outlined" />
              <Chip label={`Unanswered: ${questions.length - answeredCount}`} color="warning" variant="outlined" />
              <Chip label={`Flagged: ${Object.values(flagged).filter(Boolean).length}`} color="error" variant="outlined" />
            </Box>
          </Box>
          {redirectMessage && (
            <Alert severity="success" sx={{ mt: 3 }}>{redirectMessage}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmSubmit} 
            variant="contained" 
            color="primary"
            autoFocus
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time Up Dialog */}
      <Dialog open={timeUpDialogOpen} onClose={() => {}}>
        <DialogTitle>Time's Up!</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your time for this exam has ended. Your answers are being submitted automatically.
          </DialogContentText>
          {autoSubmitting && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
          {redirectMessage && (
            <Alert severity="info" sx={{ mt: 3 }}>{redirectMessage}</Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Modal */}
      <Dialog open={submittingModalOpen} PaperProps={{ sx: { textAlign: 'center', p: 4 } }}>
        <DialogContent>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Submitting your quiz, please wait...
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Error Popup */}
      {errorPopup && (
        <ErrorPopup 
          message={errorPopup} 
          onClose={() => setErrorPopup(null)} 
        />
      )}

      {/* Resume Notification */}
      <Snackbar
        open={resumeNotification}
        onClose={() => setResumeNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          onClose={() => setResumeNotification(false)}
          sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          action={
            <Button color="inherit" size="small" onClick={() => setResumeNotification(false)}>
              Resume Quiz
            </Button>
          }
        >
          Your previous progress has been restored. You can continue your quiz from where you left off.
        </Alert>
      </Snackbar>
    </Box>
  )
}