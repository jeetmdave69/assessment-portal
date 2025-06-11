'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Card,
  CardContent,
} from '@mui/material'
import { supabase } from '@/utils/supabaseClient'

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
  quiz_name: string
  duration: number
}

export default function AttemptQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = parseInt(Array.isArray(params?.quizId) ? params.quizId[0] : params?.quizId || '', 10)

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId) return

      const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', quizId).single()
      const { data: questionData } = await supabase.from('questions').select('*').eq('quiz_id', quizId)

      const parsedQuestions = (questionData || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      }))

      setQuiz(quizData)
      setQuestions(parsedQuestions)
      setTimeLeft((quizData?.duration || 30) * 60)
      setLoading(false)
    }

    fetchData()
  }, [quizId])

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return
    const interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(interval)
  }, [timeLeft, submitted])

  const handleOptionChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    setSubmitted(true)

    const normalizedAnswers: Record<number, string> = {}
    const correctAnswerMap: Record<number, string[]> = {}
    let correctAnswers = 0

    questions.forEach((q) => {
      const userAnswer = answers[q.id]?.trim().toLowerCase()
      normalizedAnswers[q.id] = userAnswer || ''

      const correctOption = q.options.find((o) => o.isCorrect)
      const correctText = correctOption?.text.trim().toLowerCase()

      if (correctText) {
        correctAnswerMap[q.id] = [correctText]
      }

      if (userAnswer && correctText && userAnswer === correctText) {
        correctAnswers += 1
      }
    })

    const { data, error } = await supabase.from('attempts').insert([
      {
        quiz_id: quizId,
        answers: normalizedAnswers,
        correct_answers: correctAnswerMap,
        submitted_at: new Date().toISOString(),
        score: correctAnswers,
      },
    ]).select('id').single()

    if (error) {
      alert('Something went wrong. Please try again.')
      setSubmitted(false)
      return
    }

    const attemptId = data.id
    router.push(`/result/${attemptId}`)
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (loading) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <Container>
        <Typography variant="h6" color="error" sx={{ mt: 4 }}>
          ❌ No questions found for this quiz. Please check your quiz data.
        </Typography>
      </Container>
    )
  }

  const q = questions[current]

  return (
    <Box sx={{ minHeight: '100vh', background: '#f4f4f4' }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ color: '#333' }}>
            {quiz?.quiz_name}
          </Typography>
          <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>
            ⏳ {formatTime(timeLeft)}
          </Typography>
        </Box>

        {q ? (
          <Card sx={{ backgroundColor: '#fff', color: '#000', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#000' }}>
                Q{current + 1}: {q.question_text}
              </Typography>
              <RadioGroup
                value={answers[q.id] || ''}
                onChange={(e) => handleOptionChange(q.id, e.target.value)}
              >
                {q.options.map((opt, idx) => (
                  <FormControlLabel
                    key={idx}
                    value={opt.text}
                    control={<Radio />}
                    label={<Typography sx={{ color: '#000' }}>{opt.text}</Typography>}
                  />
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ) : (
          <Typography color="error" sx={{ mt: 2 }}>
            Could not load the question.
          </Typography>
        )}

        <Box mt={3} display="flex" justifyContent="space-between">
          <Button
            variant="outlined"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            Back
          </Button>

          {current < questions.length - 1 ? (
            <Button variant="contained" onClick={() => setCurrent((c) => c + 1)}>
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={submitted || timeLeft <= 0}
            >
              {submitted ? 'Submitted' : 'Submit'}
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  )
}
