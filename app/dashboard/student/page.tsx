'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
  CircularProgress,
  TextField,
} from '@mui/material';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import AppWelcome from '@/sections/overview/app-welcome';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import DevRoleSwitcher from '@/components/DevRoleSwitcher';

export default function StudentDashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [availableTests, setAvailableTests] = useState(0);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  const role = user?.publicMetadata?.role;

  useEffect(() => {
    setMounted(true);
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('is_draft', false)
          .lte('start_time', now.toISOString())
          .gte('end_time', now.toISOString());

        if (error) throw error;

        setAllQuizzes(data || []);
        setAvailableTests(data?.length || 0);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleAccessCodeSubmit = async () => {
    setCodeError('');
    if (!accessCode.trim()) {
      setCodeError('Please enter a code.');
      return;
    }

    setCodeLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('access_code', accessCode.trim())
        .eq('is_draft', false)
        .limit(1)
        .single();

      if (error || !data) {
        setCodeError('Invalid or expired code.');
        return;
      }

      const now = new Date();
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);

      if (now < start) {
        setCodeError('Quiz has not started yet.');
      } else if (now > end) {
        setCodeError('This quiz has already ended.');
      } else {
        router.push(`/attempt-quiz/${data.id}`);
      }
    } catch (err) {
      setCodeError('Something went wrong. Try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
 <AppWelcome
  title={`Welcome, ${user?.firstName || 'Student'}!`}
  description="Your available assessments are listed below. Good luck!"
  role={role as 'teacher' | 'student' | 'admin'} // ✅ Pass correct prop
/>

        <Stack direction="row" spacing={2} alignItems="center">
          <DevRoleSwitcher />
          <ThemeToggleButton />
          <Button variant="outlined" color="error" onClick={() => signOut()}>
            Sign Out
          </Button>
        </Stack>
      </Stack>

      {/* Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <AppWidgetSummary
            title="Available Tests"
            total={availableTests}
            icon="mdi:file-document-outline"
            color="info"
          />
        </Grid>
      </Grid>

      {/* Access Code Input */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Join a Quiz Using Access Code
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Enter Access Code"
            variant="outlined"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            error={!!codeError}
            helperText={codeError}
            fullWidth
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAccessCodeSubmit}
            disabled={codeLoading}
            sx={{ minWidth: 160, height: '100%' }}
          >
            {codeLoading ? 'Checking...' : 'Start Test'}
          </Button>
        </Stack>
      </Box>

      {/* Quiz Cards */}
      <Box mt={4}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : allQuizzes.length === 0 ? (
          <Typography variant="h6" align="center" color="text.secondary">
            No active quizzes available right now.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {allQuizzes.map((quiz) => {
              const now = new Date();
              const start = new Date(quiz.start_time);
              const end = new Date(quiz.end_time);

              let status = 'Live';
              let statusColor = 'info.light';
              let statusTextColor = 'info.darker';

              if (start > now) {
                status = 'Upcoming';
                statusColor = 'warning.light';
                statusTextColor = 'warning.darker';
              } else if (end < now) {
                status = 'Closed';
                statusColor = 'error.light';
                statusTextColor = 'error.dark';
              }

              return (
                <Grid item xs={12} sm={6} md={4} key={quiz.id}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 3,
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {quiz.title}
                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          component="span"
                          sx={{
                            fontSize: 12,
                            px: 1.2,
                            py: 0.4,
                            bgcolor: statusColor,
                            color: statusTextColor,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {status}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Ends: {new Date(quiz.end_time).toLocaleTimeString()}
                        </Typography>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        ⏱ Duration: <strong>{quiz.duration_minutes || 0}</strong> mins
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        🔁 Attempts allowed: <strong>{quiz.max_attempts || 1}</strong>
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        ✅ Grade to pass: <strong>{quiz.pass_marks}</strong> / {quiz.total_marks}
                      </Typography>
                    </Stack>

                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ mt: 3, borderRadius: 2, fontWeight: 600 }}
                      onClick={() => router.push(`/attempt-quiz/${quiz.id}`)}
                      disabled={status !== 'Live'}
                    >
                      🚀 Attempt Quiz
                    </Button>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Container>
  );
}
