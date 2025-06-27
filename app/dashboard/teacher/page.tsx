'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
  Pagination,
  Card,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
} from '@mui/material';
import { useClerk, useUser } from '@clerk/nextjs';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { supabase } from '@/utils/supabaseClient';
import { format } from 'date-fns';
import DeleteIcon from '@mui/icons-material/Delete';

// Lazy load components
const QuizTable = lazy(() => import('@/components/dashboard/QuizTable'));
const QuizAnalytics = lazy(() => import('@/components/dashboard/QuizAnalytics'));
const AppWelcome = lazy(() => import('@/sections/overview/app-welcome'));
const AppWidgetSummary = lazy(() => import('@/sections/overview/app-widget-summary'));

export interface Quiz {
  id: number;
  quiz_title: string;
  duration?: number | null;
  is_draft?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  access_code?: string | null;
  total_marks?: number | null;
  shuffle_questions?: boolean | null;
  shuffle_options?: boolean | null;
  max_attempts?: number | null;
  preview_mode?: boolean | null;
  score?: number;
  user_id: string;
  description?: string | null;
  passing_score?: number;
  show_correct_answers?: boolean;
  attempts?: number | null;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats
  const [activeTests, setActiveTests] = useState(0);
  const [upcomingTests, setUpcomingTests] = useState(0);
  const [pastTests, setPastTests] = useState(0);

  const paginatedQuizzes = quizzes.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const fetchQuizzes = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      const processedQuizzes = data?.map(quiz => ({
        ...quiz,
        quiz_title: quiz.quiz_title || 'Untitled Quiz',
        access_code: quiz.access_code || '',
      })) || [];

      setQuizzes(processedQuizzes);
      calculateStats(processedQuizzes);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (quizData: Quiz[]) => {
    const now = new Date();
    
    const active = quizData.filter(q => {
      const start = q.start_time ? new Date(q.start_time) : null;
      const end = q.end_time ? new Date(q.end_time) : null;
      return start && end && start <= now && end > now && !q.is_draft;
    }).length;
    
    const upcoming = quizData.filter(q => {
      const start = q.start_time ? new Date(q.start_time) : null;
      return start && start > now && !q.is_draft;
    }).length;
    
    const past = quizData.filter(q => {
      const end = q.end_time ? new Date(q.end_time) : null;
      return end && end <= now && !q.is_draft;
    }).length;

    setActiveTests(active);
    setUpcomingTests(upcoming);
    setPastTests(past);
  };

  const getQuizStatus = (quiz: Quiz) => {
    const now = new Date();
    const start = quiz.start_time ? new Date(quiz.start_time) : null;
    const end = quiz.end_time ? new Date(quiz.end_time) : null;

    if (quiz.is_draft) return 'Draft';
    if (!start || !end) return 'Unknown';
    if (now < start) return 'Upcoming';
    if (now >= start && now <= end) return 'Active';
    return 'Completed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Upcoming': return 'info';
      case 'Completed': return 'warning';
      case 'Draft': return 'default';
      default: return 'primary';
    }
  };

  const handleDeleteClick = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizToDelete.id);

      if (error) throw error;

      // Also delete related questions and results in a transaction
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', quizToDelete.id);

      if (questionsError) throw questionsError;

      // Refresh the quiz list
      await fetchQuizzes();
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete quiz. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setQuizToDelete(null);
  };

  useEffect(() => {
    setPage(1);
  }, [quizzes]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchQuizzes();

      const subscription = supabase
        .channel('quizzes_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quizzes',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            fetchQuizzes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isLoaded, user?.id]);

  if (!isLoaded || loading) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <Alert severity="error">You must be logged in to view this page</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Assessment Portal
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <ThemeToggleButton />
            <Button variant="outlined" color="error" onClick={() => signOut()}>
              Sign Out
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ pt: 4, pb: 6, px: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Suspense fallback={<CircularProgress />}>
          <AppWelcome
            title={`Welcome, ${user?.firstName || 'Teacher'}!`}
            description="Create, manage, and track your quizzes from this dashboard."
            role="teacher"
            showCreateQuizButton={true}
            createQuizAction={() => router.push('/create-quiz')}
          />
        </Suspense>

        <Box sx={{ my: 4 }} />

        <Typography variant="h6" fontWeight={700} mb={2}>
          Test Overview
        </Typography>
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={4}>
            <Suspense fallback={<CircularProgress />}>
              <AppWidgetSummary
                title="Active Tests"
                total={activeTests}
                icon="mdi:file-document-edit"
                color="success"
              />
            </Suspense>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Suspense fallback={<CircularProgress />}>
              <AppWidgetSummary
                title="Upcoming Tests"
                total={upcomingTests}
                icon="mdi:calendar-clock"
                color="info"
              />
            </Suspense>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Suspense fallback={<CircularProgress />}>
              <AppWidgetSummary
                title="Past Tests"
                total={pastTests}
                icon="mdi:history"
                color="warning"
              />
            </Suspense>
          </Grid>
        </Grid>

        <Typography variant="h6" fontWeight={700} mb={2}>
          Your Recent Quizzes
        </Typography>
        <Box mb={4}>
          <Grid container spacing={2}>
            {quizzes.slice(0, 3).map((quiz) => {
              const status = getQuizStatus(quiz);
              return (
                <Grid item xs={12} sm={6} md={4} key={quiz.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease'
                      }
                    }}
                    onClick={() => router.push(`/quiz/${quiz.id}`)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="h6" fontWeight={600}>
                          {quiz.quiz_title}
                        </Typography>
                        <Chip 
                          label={status} 
                          color={getStatusColor(status)} 
                          size="small" 
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Access Code: {quiz.access_code || 'None'}
                      </Typography>
                      <Typography variant="body2">
                        Starts: {quiz.start_time ? format(new Date(quiz.start_time), 'MMM dd, yyyy hh:mm a') : '—'}
                      </Typography>
                      <Typography variant="body2">
                        Ends: {quiz.end_time ? format(new Date(quiz.end_time), 'MMM dd, yyyy hh:mm a') : '—'}
                      </Typography>
                      <Typography variant="body2">
                        Duration: {quiz.duration ?? '-'} min
                      </Typography>
                      <Typography variant="body2">
                        Total Marks: {quiz.total_marks ?? '-'}
                      </Typography>
                      {quiz.description && (
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          {quiz.description}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        <Typography variant="h6" fontWeight={700} mb={2}>
          All Your Quizzes
        </Typography>
        <Box boxShadow={1} p={2} borderRadius={2} bgcolor="background.paper" mb={4}>
          <Suspense fallback={<CircularProgress />}>
            <QuizTable
              quizzes={paginatedQuizzes.map(q => ({
                id: q.id,
                title: q.quiz_title,
                status: getQuizStatus(q),
                start_time: q.start_time || '',
                end_time: q.end_time || '',
                attempts: q.attempts ?? 0,
                access_code: q.access_code || '',
              }))}
            />
          </Suspense>
          
          {quizzes.length > rowsPerPage && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(quizzes.length / rowsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>

        <Typography variant="h6" fontWeight={700} mb={2}>
          Performance Analytics
        </Typography>
        <Box boxShadow={1} p={2} borderRadius={2} bgcolor="background.paper">
          <Suspense fallback={<CircularProgress />}>
            <QuizAnalytics />
          </Suspense>
        </Box>

        {/* Custom Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'error.main' }}>
                <DeleteIcon />
              </Avatar>
              <Typography variant="h6">Delete Quiz</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete this quiz?
            </DialogContentText>
            <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                {quizToDelete?.quiz_title || 'Untitled Quiz'}
              </Typography>
              {quizToDelete?.description && (
                <Typography variant="body2" color="text.secondary">
                  {quizToDelete.description}
                </Typography>
              )}
              <Typography variant="body2" mt={1}>
                Access Code: {quizToDelete?.access_code || 'None'}
              </Typography>
            </Box>
            <Alert severity="error" sx={{ mt: 2 }}>
              This action cannot be undone. All questions and results for this quiz will also be deleted.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleDeleteCancel}
              variant="outlined"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={isDeleting}
              startIcon={
                isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />
              }
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}