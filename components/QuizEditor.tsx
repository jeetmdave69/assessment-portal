'use client'

import { useState } from 'react'
import QuestionForm from './QuestionForm'
import { v4 as uuidv4 } from 'uuid'

interface Question {
  id: string
  questionText: string
  options: string[]
  correctAnswerIndex: number
}

interface QuizEditorProps {
  initialTitle?: string
  initialDuration?: number
  initialQuestions?: Question[]
  onSave: (quiz: { title: string; duration: number; questions: Question[] }) => void
}

export default function QuizEditor({
  initialTitle = '',
  initialDuration = 10,
  initialQuestions = [],
  onSave,
}: QuizEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [duration, setDuration] = useState(initialDuration) // in minutes
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)

  function addQuestion() {
    const newQuestion: Question = {
      id: uuidv4(),
      questionText: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
    }
    setQuestions([...questions, newQuestion])
  }

  function updateQuestion(id: string, updatedFields: Partial<Question>) {
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updatedFields } : q))
    )
  }

  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  function handleSave() {
    // Basic validation: title and at least one question with text
    if (!title.trim()) {
      alert('Quiz title is required')
      return
    }
    if (questions.length === 0) {
      alert('Add at least one question')
      return
    }
    for (const q of questions) {
      if (!q.questionText.trim()) {
        alert('All questions must have text')
        return
      }
      if (q.options.some(opt => !opt.trim())) {
        alert('All options must be filled')
        return
      }
    }
    onSave({ title, duration, questions })
  }

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded shadow space-y-6">
      <div>
        <label className="block font-semibold mb-1">Quiz Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Enter quiz title"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Duration (minutes)</label>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={e => setDuration(parseInt(e.target.value))}
          className="w-24 border rounded p-2"
        />
      </div>

      <div className="space-y-4">
        {questions.map(question => (
          <QuestionForm
            key={question.id}
            question={question}
            onUpdate={updatedFields => updateQuestion(question.id, updatedFields)}
            onRemove={() => removeQuestion(question.id)}
          />
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Add Question
      </button>

      <button
        onClick={handleSave}
        className="px-6 py-3 bg-blue-700 text-white rounded hover:bg-blue-800"
      >
        Save Quiz
      </button>
    </div>
  )
}
