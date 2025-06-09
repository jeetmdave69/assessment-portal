'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import AppWelcome from '@/sections/overview/app-welcome'; // ✅ Import the welcome card

export default function AdminDashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [quizCount, setQuizCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [{ count: quizCount }, { count: userCount }, teachers, students, quizzes] =
          await Promise.all([
            supabase.from('quizzes').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*').eq('role', 'teacher'),
            supabase.from('users').select('*').eq('role', 'student'),
            supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(5),
          ]);

        setQuizCount(quizCount || 0);
        setUserCount(userCount || 0);
        setTeacherCount(teachers.data?.length || 0);
        setStudentCount(students.data?.length || 0);
        setRecentQuizzes(quizzes.data || []);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (quiz: any) => {
    const now = new Date();
    if (new Date(quiz.start_time) > now) return <Chip label="Upcoming" color="warning" size="small" />;
    if (new Date(quiz.end_time) < now) return <Chip label="Closed" color="error" size="small" />;
    return <Chip label="Live" color="success" size="small" />;
  };

  if (!mounted) return null;

  return (
    <Container maxWidth="xl">
      {/* ✅ Welcome Card */}
      <AppWelcome
        title={`Welcome back, ${user?.firstName || 'Admin'}!`}
        description="Manage quizzes, users, and platform activity from this dashboard."
        showCreateQuizButton={true}
        createQuizAction={() => router.push('/create-quiz')}
      />

      {/* Header Controls */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <Stack direction="row" spacing={2}>
          <ThemeToggleButton />
          <Button variant="outlined" color="error" onClick={() => signOut()}>
            Sign Out
          </Button>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Total Quizzes" total={quizCount} icon="mdi:clipboard-text" color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Total Users" total={userCount} icon="mdi:account-multiple" color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Teachers" total={teacherCount} icon="mdi:account-tie" color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AppWidgetSummary title="Students" total={studentCount} icon="mdi:school" color="warning" />
        </Grid>
      </Grid>

      {/* Recent Quizzes List */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Recent Quizzes
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {recentQuizzes.map((quiz) => (
            <Paper key={quiz.id} elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {quiz.title}
                </Typography>
                {getStatusBadge(quiz)}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
