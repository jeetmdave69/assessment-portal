'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  PlusCircle,
  FileText,
  FileQuestion,
  Users,
  BarChart,
  LogOut,
  Calendar,
  ArrowRight
} from 'lucide-react'

// ✅ Type definition for a quiz
type Quiz = {
  id: string
  title: string
  createdAt: string
  questions: { question: string }[]
  attempts: number
  status: 'draft' | 'published'
}

function StatsCard({
  title,
  value,
  icon
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center p-5 transition-all duration-300 hover:scale-[1.02]">
      <div className="text-blue-500 mb-3">{icon}</div>
      <p className="text-4xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm text-gray-600 font-medium">{title}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!user) return

    const fetchQuizzes = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/quizzes', {
          headers: {
            'Content-Type': 'application/json',
            'User-ID': user.id
          }
        })

        if (response.ok) {
          const data = await response.json()
          setQuizzes(data)
        }
      } catch (err) {
        console.log('Error fetching quizzes', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuizzes()
  }, [user])

  const totalAttempts = useMemo(
    () => quizzes.reduce((acc, quiz) => acc + (quiz.attempts || 0), 0),
    [quizzes]
  )

  const totalQuestions = useMemo(
    () => quizzes.reduce((acc, quiz) => acc + (quiz.questions?.length || 0), 0),
    [quizzes]
  )

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-6" />
          <p className="text-gray-600 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Welcome back, <span className="text-blue-600">{user.firstName || 'User'}</span>
            </h1>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              Manage your assessments and track performance
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/create-quiz')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <PlusCircle size={20} />
              <span>New Assessment</span>
            </button>

            <SignOutButton>
              <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow">
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </SignOutButton>
          </div>
        </header>

        {/* Stats Section */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart size={28} className="text-blue-500" />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Performance Overview
              </span>
            </h2>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent flex-1 mx-4 hidden sm:block" />
            <p className="text-gray-500 mt-4 sm:mt-0">
              {quizzes.length} {quizzes.length === 1 ? 'assessment' : 'assessments'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatsCard title="Total Assessments" value={quizzes.length} icon={<FileText size={32} />} />
            <StatsCard title="Total Questions" value={totalQuestions} icon={<FileQuestion size={32} />} />
            <StatsCard title="Total Attempts" value={totalAttempts} icon={<Users size={32} />} />
          </div>
        </section>

        {/* Assessments Section */}
        <section className="text-center">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Assessments</h2>
            <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto" />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mb-4"></div>
              <p className="text-gray-600">Loading your assessments...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="py-12">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-8">
                <div className="relative">
                  <FileText className="text-blue-500" size={56} />
                  <PlusCircle className="absolute -bottom-2 -right-2 bg-white text-blue-600 rounded-full shadow-md" size={28} />
                </div>
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3">No assessments yet</h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                Create your first assessment to get started
              </p>
              <button
                onClick={() => router.push('/create-quiz')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <PlusCircle size={20} />
                Create New Assessment
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => router.push(`/quiz/${quiz.id}`)}
                >
                  <div className="text-left">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {quiz.title}
                      </h3>
                      {quiz.status === 'draft' && (
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-6 text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="mr-2 text-blue-400" size={20} />
                        <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <FileQuestion className="mr-2 text-blue-400" size={20} />
                        <span>{quiz.questions.length} questions</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-2 text-blue-400" size={20} />
                        <span>{quiz.attempts} attempts</span>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        className="flex items-center text-blue-600 font-medium group-hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/quiz/${quiz.id}`)
                        }}
                      >
                        {quiz.status === 'draft' ? 'Continue Editing' : 'View Details'}
                        <ArrowRight className="ml-2" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 pb-6 text-center text-gray-500 text-sm border-t border-gray-100">
          <p>© {new Date().getFullYear()} Quiz Platform. All rights reserved.</p>
        </footer>
      </div>
    </main>
  )
}
