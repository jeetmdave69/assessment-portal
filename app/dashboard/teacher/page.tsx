'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useClerk, useUser } from '@clerk/nextjs';

import AppWelcome from '@/sections/overview/app-welcome';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import QuizTable from '@/components/dashboard/QuizTable';
import QuizAnalytics from '@/components/dashboard/QuizAnalytics';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import DevRoleSwitcher from '@/components/DevRoleSwitcher';
import { supabase } from '@/utils/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [activeTests, setActiveTests] = useState(0);
  const [upcomingTests, setUpcomingTests] = useState(0);
  const [pastTests, setPastTests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const role = user?.publicMetadata?.role;

  useEffect(() => {
    setMounted(true);

    const fetchQuizStats = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('quizzes').select('*');
      if (error) {
        console.error('Error fetching quiz stats:', error.message);
        setLoading(false);
        return;
      }

      const now = new Date();

      const active = data.filter(
        (q) =>
          new Date(q.start_time) <= now &&
          new Date(q.end_time) > now &&
          !q.is_draft
      );
      const upcoming = data.filter(
        (q) => new Date(q.start_time) > now && !q.is_draft
      );
      const past = data.filter(
        (q) => new Date(q.end_time) <= now && !q.is_draft
      );

      setActiveTests(active.length);
      setUpcomingTests(upcoming.length);
      setPastTests(past.length);
      setLoading(false);
    };

    fetchQuizStats();
  }, []);

  const handleCreateQuiz = () => {
    console.log('Navigating to /create-quiz'); // ✅ Debug log
    router.push('/create-quiz');
  };

  if (!mounted) return null;

  return (
    <Container maxWidth="xl">
      {/* Header Row: Welcome + Controls */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Stack spacing={2}>
          <AppWelcome
            title={`Welcome, ${user?.firstName || 'User'}!`}
            description="Create, monitor, and analyze assessments from your dashboard."
          />

          {/* Show only if teacher */}
          {role === 'teacher' && (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateQuiz}
                disableElevation
                sx={{
                  width: 'fit-content',
                  px: 3,
                  py: 1,
                  fontWeight: 'bold',
                  borderRadius: 2,
                  zIndex: 2,
                }}
              >
                Create Quiz
              </Button>

              {/* Optional fallback link in case button doesn't work */}
              {/* <Link href="/create-quiz">
                <Button variant="outlined" sx={{ mt: 1 }}>
                  Fallback Link to Create Quiz
                </Button>
              </Link> */}
            </>
          )}
        </Stack>

        <Stack direction="row" spacing={2}>
          <DevRoleSwitcher />
          <ThemeToggleButton />
          <Button variant="outlined" color="error" onClick={() => signOut()}>
            Sign Out
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <AppWidgetSummary
                title="Active Tests"
                total={activeTests}
                icon="mdi:file-document-edit"
                color="success"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <AppWidgetSummary
                title="Upcoming Tests"
                total={upcomingTests}
                icon="mdi:calendar-clock"
                color="info"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <AppWidgetSummary
                title="Past Tests"
                total={pastTests}
                icon="mdi:history"
                color="warning"
              />
            </Grid>
          </Grid>

          <Box mt={4}>
            <QuizTable />
          </Box>

          <Box mt={4}>
            <QuizAnalytics />
          </Box>
        </>
      )}
    </Container>
  );
}
