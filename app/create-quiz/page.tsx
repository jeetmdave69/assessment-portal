'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Info as InfoIcon } from 'lucide-react'

interface Question {
  questionText: string
  options: string[]
  correctIndex: number
}

export default function CreateQuizPage() {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [quizDate, setQuizDate] = useState<Date | undefined>(new Date())
  const [questions, setQuestions] = useState<Question[]>([
    { questionText: '', options: ['', '', '', ''], correctIndex: 0 },
  ])
  const [message, setMessage] = useState('')
  const [quizCode, setQuizCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setQuizCode('')

    // Validation logic omitted for brevity

    const quizData = { 
      title, 
      duration, 
      scheduledAt: quizDate?.toISOString(),
      questions 
    }

    try {
      const res = await fetch('/api/create-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      })
      const json = await res.json()

      if (res.ok) {
        setQuizCode(json.quizCode)
        setMessage('Quiz created successfully! Share this code with students:')
      } else {
        setMessage('Error: ' + (json.error || 'Failed to create quiz'))
      }
    } catch {
      setMessage('Failed to create quiz. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleQuestionChange(index: number, value: string) {
    const newQuestions = [...questions]
    newQuestions[index].questionText = value
    setQuestions(newQuestions)
  }

  function handleOptionChange(qIndex: number, oIndex: number, value: string) {
    const newQuestions = [...questions]
    newQuestions[qIndex].options[oIndex] = value
    setQuestions(newQuestions)
  }

  function handleCorrectChange(qIndex: number, oIndex: number) {
    const newQuestions = [...questions]
    newQuestions[qIndex].correctIndex = oIndex
    setQuestions(newQuestions)
  }

  function addQuestion() {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctIndex: 0 }])
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return
    const newQuestions = [...questions]
    newQuestions.splice(index, 1)
    setQuestions(newQuestions)
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 to-indigo-50 flex justify-center py-10 px-5">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl p-10 md:p-14">
        {/* Header */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-2 select-none">Create New Quiz</h1>
          <p className="text-indigo-700 text-lg font-medium opacity-90">
            Design your quiz, set the schedule, and share with students
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Quiz Details */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-indigo-800">
                Quiz Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Enter quiz title"
                className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-5 py-3 placeholder-indigo-400 
                           outline-none focus:ring-3 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-indigo-800">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={duration}
                min={1}
                onChange={e => setDuration(Number(e.target.value))}
                required
                className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-5 py-3 placeholder-indigo-400 
                           outline-none focus:ring-3 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-indigo-800">
                Quiz Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={quizDate ? format(quizDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={e => setQuizDate(new Date(e.target.value))}
                  required
                  className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-5 py-3 pr-12 placeholder-indigo-400
                             outline-none focus:ring-3 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
                />
                <CalendarIcon className="absolute right-4 top-4 h-5 w-5 text-indigo-400 pointer-events-none select-none" />
              </div>
            </div>
          </section>

          {/* Questions */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-900 mb-8">Questions</h2>

            <div className="space-y-8">
              {questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-indigo-800 tracking-wide text-lg">
                      Question {qIndex + 1}
                    </h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 font-semibold hover:text-red-800 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.questionText}
                    onChange={e => handleQuestionChange(qIndex, e.target.value)}
                    required
                    placeholder="Enter your question here..."
                    className="w-full rounded-lg border border-indigo-300 bg-white px-5 py-3 font-semibold placeholder-indigo-400
                               outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition shadow-sm mb-6"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {q.options.map((opt, oIndex) => (
                      <label
                        key={oIndex}
                        className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer select-none transition
                          ${
                            q.correctIndex === oIndex
                              ? 'border-indigo-600 bg-indigo-100 shadow-inner font-semibold text-indigo-900'
                              : 'border-indigo-200 hover:border-indigo-400 bg-white'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctIndex === oIndex}
                          onChange={() => handleCorrectChange(qIndex, oIndex)}
                          required
                          className="w-5 h-5 text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                          required
                          placeholder={`Option ${oIndex + 1}`}
                          className="w-full border-none bg-transparent text-indigo-900 font-semibold placeholder-indigo-400 
                                    focus:outline-none focus:ring-0 cursor-text"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="mt-10 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 hover:bg-indigo-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Another Question
            </button>
          </section>

          {/* Submit */}
          <div className="mt-12">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-3xl font-bold text-white text-lg shadow-xl transition-all ${
                isSubmitting 
                  ? "bg-indigo-300 cursor-not-allowed" 
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
              }`}
            >
              {isSubmitting ? 'Creating Quiz...' : 'Create Quiz'}
            </button>
          </div>
        </form>

        {/* Result Message */}
        {message && (
          <div
            className={`mt-12 p-6 rounded-2xl border-2 
            ${
              quizCode 
                ? "bg-green-50 border-green-400 text-green-700" 
                : "bg-red-50 border-red-400 text-red-700"
            }
            shadow-lg select-text`}
          >
            <p className="text-center font-semibold text-xl">{message}</p>
            {quizCode && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="text-5xl font-mono font-extrabold tracking-wide bg-white px-10 py-6 rounded-2xl border-4 border-dashed border-green-400 select-all">
                  {quizCode}
                </div>
                <p className="text-center max-w-xl text-green-800 font-medium">
                  Share this code with your students. They can use it to access the quiz at the scheduled time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <section className="mt-14 p-8 bg-indigo-100 rounded-3xl shadow-inner border border-indigo-300 max-w-3xl mx-auto text-indigo-900 select-none">
          <div className="flex items-center gap-4 mb-6">
            <InfoIcon className="h-9 w-9 stroke-indigo-700" />
            <h3 className="text-2xl font-semibold tracking-tight">How it works</h3>
          </div>
          <ul className="list-disc list-inside space-y-3 text-lg font-medium leading-relaxed">
            <li>Set a date/time when the quiz will be available</li>
            <li>After creating the quiz, you'll receive a unique access code</li>
            <li>Share this code with your students</li>
            <li>Students enter the code at the scheduled time to take the quiz</li>
            <li>You can view results on your dashboard after the quiz ends</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
