'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
  TextField,
  Pagination,
  Tabs,
  Tab,
} from '@mui/material';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import AppWelcome from '@/sections/overview/app-welcome';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

const COMPLETED_PAGE_SIZE = 6;

export default function StudentDashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [userAttempts, setUserAttempts] = useState<Record<number, number>>({});
  const [availableTests, setAvailableTests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [completedPage, setCompletedPage] = useState(1);
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [tab, setTab] = useState(0);

  // Move quiz classification variables above useEffect hooks
  const now = new Date();
  const classify = (q: any): 'live' | 'upcoming' | 'completed' | 'expired' => {
    const start = new Date(q.start_time);
    const end = new Date(q.end_time);
    const done = (userAttempts[q.id] || 0) >= (q.max_attempts || 1);
    if (done) return 'completed';
    if (now > end) return 'expired';
    if (now < start) return 'upcoming';
    return 'live';
  };
  const liveQuizzes = allQuizzes.filter((q) => classify(q) === 'live');
  const upcomingQuizzes = allQuizzes.filter((q) => classify(q) === 'upcoming');
  const completedQuizzes = allQuizzes.filter((q) => ['completed', 'expired'].includes(classify(q)));
  const currentCompleted = completedQuizzes.slice(
    (completedPage - 1) * COMPLETED_PAGE_SIZE,
    completedPage * COMPLETED_PAGE_SIZE
  );

  useEffect(() => {
    setMounted(true);
    fetchQuizzes();
  }, [user]);

  useEffect(() => {
    const now = new Date();
    const avail = allQuizzes.filter((q) => {
      const end = new Date(q.end_time);
      return now < end && (userAttempts[q.id] || 0) < (q.max_attempts || 1);
    });
    setAvailableTests(avail.length);
  }, [allQuizzes, userAttempts]);

  // Move this useEffect below liveQuizzes declaration
  useEffect(() => {
    if (typeof window === 'undefined' || !liveQuizzes.length) return;
    liveQuizzes.forEach((q) => {
      if (router.prefetch) router.prefetch(`/attempt-quiz/${q.id}`);
    });
  }, [liveQuizzes, router]);

  const fetchQuizzes = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('quizzes').select('*').eq('is_draft', false);
    setAllQuizzes(data ?? []);
    if (data?.length) fetchAttempts(data.map((q) => q.id));
    setLoading(false);
  };

  const fetchAttempts = async (ids: number[]) => {
    const { data } = await supabase.from('attempts').select('quiz_id').eq('user_id', user!.id);
    const counts: Record<number, number> = {};
    ids.forEach((id) => (counts[id] = data?.filter((a) => a.quiz_id === id).length ?? 0));
    setUserAttempts(counts);
  };

  const handleAccessCodeSubmit = async () => {
    setCodeError('');
    if (!accessCode.trim()) {
      setCodeError('Enter a code.');
      return;
    }
    setCodeLoading(true);
    try {
      const { data } = await supabase.from('quizzes').select('*').eq('access_code', accessCode).single();
      if (!data) {
        setCodeError('Invalid code.');
        return;
      }
      const now = new Date();
      if (now < new Date(data.start_time)) setCodeError('Quiz not started.');
      else if (now > new Date(data.end_time)) setCodeError('Quiz ended.');
      else router.push(`/attempt-quiz/${data.id}`);
    } finally {
      setCodeLoading(false);
    }
  };

  if (!mounted || !user) return null;

  const role = ['student', 'teacher', 'admin'].includes(user.publicMetadata?.role as string)
    ? (user.publicMetadata?.role as 'student' | 'teacher' | 'admin')
    : 'student';

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" fontWeight={700}>Assessment Portal</Typography>
        <Stack direction="row" spacing={2}>
          <ThemeToggleButton />
          <Button variant="contained" color="error" onClick={() => signOut()}>Sign Out</Button>
        </Stack>
      </Box>

      <AppWelcome
        title={`Welcome, ${user?.firstName ?? 'Student'}`}
        description="Here are your assessments."
        role={role}
        showCreateQuizButton={false}
      />

      <Tabs value={tab} onChange={(_, newTab) => setTab(newTab)} sx={{ mb: 4 }}>
        <Tab label="Overview" />
        <Tab label="Quizzes" />
      </Tabs>

      {tab === 0 && (
        <>
          <Grid container spacing={3} my={4}>
            <Grid item xs={12} sm={6} md={4}>
              <AppWidgetSummary title="Available" total={availableTests} icon="mdi:file-document-outline" color="info" />
            </Grid>
          </Grid>

          <Box mb={6} p={4} borderRadius={3} bgcolor="background.paper" boxShadow={1} border="1px solid" borderColor="divider">
            <Typography variant="h6" gutterBottom>Access Quiz by Code</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Access Code"
                fullWidth
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                error={!!codeError}
                helperText={codeError}
              />
              <Button variant="contained" disabled={codeLoading} onClick={handleAccessCodeSubmit} sx={{ minWidth: 160 }}>
                {codeLoading ? 'Checking…' : 'Begin'}
              </Button>
            </Stack>
          </Box>
        </>
      )}

      {tab === 1 && (
        loading ? (
          <Box py={6} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box mb={6}>
              {liveQuizzes.length > 0 && (
                <>
                  <Typography variant="h6" mb={2}>Live</Typography>
                  <Grid container spacing={3}>
                    {liveQuizzes.map((q) => (
                      <QuizCard
                        key={q.id}
                        quiz={q}
                        status="live"
                        attempts={userAttempts[q.id] || 0}
                        onStart={() => router.push(`/attempt-quiz/${q.id}`)}
                      />
                    ))}
                  </Grid>
                </>
              )}

              {upcomingQuizzes.length > 0 && (
                <>
                  <Typography variant="h6" mb={2}>Upcoming</Typography>
                  <Grid container spacing={3}>
                    {upcomingQuizzes.map((q) => (
                      <QuizCard
                        key={q.id}
                        quiz={q}
                        status="upcoming"
                        attempts={0}
                        onStart={() => {}}
                      />
                    ))}
                  </Grid>
                </>
              )}

              {completedQuizzes.length > 0 && (
                <>
                  <Typography variant="h6" mb={2}>Completed / Expired</Typography>
                  <Grid container spacing={3}>
                    {currentCompleted.map((q) => (
                      <QuizCard
                        key={q.id}
                        quiz={q}
                        status={classify(q)}
                        attempts={userAttempts[q.id] || 0}
                        onStart={() => {}}
                      />
                    ))}
                  </Grid>
                  {completedQuizzes.length > COMPLETED_PAGE_SIZE && (
                    <Box mt={3} display="flex" justifyContent="center">
                      <Pagination
                        shape="rounded"
                        color="primary"
                        count={Math.ceil(completedQuizzes.length / COMPLETED_PAGE_SIZE)}
                        page={completedPage}
                        onChange={(_, p) => setCompletedPage(p)}
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          </>
        )
      )}
    </Container>
  );
}

function QuizCard({
  quiz,
  status,
  attempts,
  onStart,
}: {
  quiz: any;
  status: 'live' | 'upcoming' | 'completed' | 'expired';
  attempts: number;
  onStart: () => void;
}) {
  const start = new Date(quiz.start_time);
  const end = new Date(quiz.end_time);

  const map = {
    live: { badge: 'LIVE', bg: 'info.light', text: 'info.darker', btn: 'primary', disabled: false },
    upcoming: { badge: 'UPCOMING', bg: 'warning.light', text: 'warning.darker', btn: 'secondary', disabled: true },
    completed: { badge: 'COMPLETED', bg: 'success.light', text: 'success.darker', btn: 'secondary', disabled: true },
    expired: { badge: 'EXPIRED', bg: 'error.light', text: 'error.darker', btn: 'secondary', disabled: true },
  }[status];

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Box
        p={3}
        borderRadius={3}
        border="1px solid"
        borderColor="divider"
        bgcolor="background.paper"
        boxShadow={3}
        minHeight={310}
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        sx={{ '&:hover': { transform: status === 'live' ? 'translateY(-4px)' : undefined }, transition: '.2s' }}
      >
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={700}>{quiz.quiz_title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box px={1.5} py={0.4} borderRadius={2} fontSize={12} fontWeight={600} textTransform="uppercase" bgcolor={map.bg} color={map.text}>
              {map.badge}
            </Box>
            <Typography variant="caption" color="text.secondary">Starts: {formatDateTime(start)}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" ml={6}>Ends: {formatDateTime(end)}</Typography>
          <Typography variant="body2" color="text.secondary">Duration: <strong>{quiz.duration_minutes} min</strong></Typography>
          <Typography variant="body2" color="text.secondary">Attempts: <strong>{attempts}</strong> / {quiz.max_attempts}</Typography>
          <Typography variant="body2" color="text.secondary">Pass: <strong>{quiz.pass_marks}</strong> / {quiz.total_marks}</Typography>
        </Stack>
        <Button
          variant="contained"
          color={map.btn as any}
          disabled={map.disabled}
          onClick={onStart}
          sx={{ mt: 3, textTransform: 'none', fontWeight: 600 }}
        >
          {status === 'live' ? 'Start Quiz' : map.badge}
        </Button>
      </Box>
    </Grid>
  );
}