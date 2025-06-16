'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';

import { useClerk, useUser } from '@clerk/nextjs';

import AppWelcome from '@/sections/overview/app-welcome';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import QuizTable from '@/components/dashboard/QuizTable';
import QuizAnalytics from '@/components/dashboard/QuizAnalytics';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { supabase } from '@/utils/supabaseClient';

export interface Quiz {
  id: number;
  title: string;
  is_draft?: boolean;
  start_time: string;
  end_time: string;
  attempts?: number;
  access_code: string;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeTests, setActiveTests] = useState(0);
  const [upcomingTests, setUpcomingTests] = useState(0);
  const [pastTests, setPastTests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchQuizStats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('creator_id', user.id);

        if (error) throw error;

        const quizzesWithTitle = (data || []).map((quiz: any) => ({
          ...quiz,
          title: quiz.quiz_title || 'Untitled Quiz',
          access_code: quiz.access_code || '',
        }));

        setQuizzes(quizzesWithTitle);

        const now = new Date();
        setActiveTests(
          quizzesWithTitle.filter(
            (q) =>
              new Date(q.start_time) <= now &&
              new Date(q.end_time) > now &&
              !q.is_draft
          ).length
        );
        setUpcomingTests(
          quizzesWithTitle.filter(
            (q) => new Date(q.start_time) > now && !q.is_draft
          ).length
        );
        setPastTests(
          quizzesWithTitle.filter(
            (q) => new Date(q.end_time) <= now && !q.is_draft
          ).length
        );
      } catch (err: any) {
        console.error('Error fetching quiz stats:', err.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizStats();
  }, [user?.id]);

  if (loading || !user) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Bar */}
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

      <Container maxWidth="xl" sx={{ pt: 4, pb: 6 }}>
        {/* Welcome and Action Button */}
        <Grid container spacing={3} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={8}>
            <AppWelcome
              title={`Welcome, ${user?.firstName || 'Teacher'}!`}
              description="Create, manage, and track your quizzes from this dashboard."
            />
          </Grid>
          <Grid item xs={12} md={4} display="flex" justifyContent="flex-end">
            <Button
              onClick={() => router.push('/create-quiz')}
              variant="contained"
              color="primary"
              sx={{
                px: 4,
                py: 1.75,
                fontWeight: 600,
                borderRadius: 2,
                minWidth: { xs: '100%', md: 180 },
                boxShadow: 3,
              }}
              fullWidth
            >
              + CREATE NEW QUIZ
            </Button>
          </Grid>
        </Grid>

        {/* Section: Quiz Stats */}
        <Typography variant="h6" fontWeight={700} mt={6} mb={2}>
          Test Overview
        </Typography>
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

        <Divider sx={{ my: 5 }} />

        {/* Section: Quiz Table */}
        <Typography variant="h6" fontWeight={700} mb={2}>
          Your Quizzes
        </Typography>
        <Box boxShadow={1} p={2} borderRadius={2} bgcolor="background.paper">
          <QuizTable quizzes={quizzes} />
        </Box>

        {/* Section: Quiz Analytics */}
        <Typography variant="h6" fontWeight={700} mt={6} mb={2}>
          Performance Analytics
        </Typography>
        <Box boxShadow={1} p={2} borderRadius={2} bgcolor="background.paper">
          <QuizAnalytics />
        </Box>
      </Container>
    </Box>
  );
}
