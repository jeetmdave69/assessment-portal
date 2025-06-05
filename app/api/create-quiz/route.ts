import { NextRequest, NextResponse } from 'next/server'

// Temporary in-memory storage (replace with a database in production)
let quizzes: any[] = []

export async function POST(req: NextRequest) {
  try {
    const { title, duration, questions } = await req.json()

    // Validate input
    if (!title || typeof title !== 'string' || !duration || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input. Please provide title, duration, and questions.' },
        { status: 400 }
      )
    }

    // Create quiz object
    const newQuiz = {
      id: Date.now().toString(),
      title,
      duration,
      questions,
      createdAt: new Date().toISOString(),
    }

    // Save quiz
    quizzes.push(newQuiz)

    return NextResponse.json(
      { message: 'Quiz created successfully', quiz: newQuiz },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/quiz error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error: Failed to create quiz' },
      { status: 500 }
    )
  }
}
