'use client'

import React from 'react'

interface Question {
  id: string
  questionText: string
  options: string[]
  correctAnswerIndex: number
}

interface QuestionFormProps {
  question: Question
  onUpdate: (updatedFields: Partial<Question>) => void
  onRemove: () => void
}

export default function QuestionForm({ question, onUpdate, onRemove }: QuestionFormProps) {
  const { questionText, options, correctAnswerIndex } = question

  function updateOption(index: number, value: string) {
    const newOptions = [...options]
    newOptions[index] = value
    onUpdate({ options: newOptions })
  }

  return (
    <div className="border p-4 rounded space-y-4">
      <div className="flex justify-between items-center">
        <label className="font-semibold">Question</label>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 font-bold"
          title="Remove Question"
        >
          &times;
        </button>
      </div>

      <input
        type="text"
        value={questionText}
        onChange={e => onUpdate({ questionText: e.target.value })}
        className="w-full border rounded p-2"
        placeholder="Enter the question text"
      />

      <div className="space-y-2">
        {options.map((option, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correctAnswer-${question.id}`}
              checked={correctAnswerIndex === idx}
              onChange={() => onUpdate({ correctAnswerIndex: idx })}
              className="accent-blue-600"
            />
            <input
              type="text"
              value={option}
              onChange={e => updateOption(idx, e.target.value)}
              className="flex-grow border rounded p-2"
              placeholder={`Option ${idx + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
