'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Grid, Typography } from '@mui/material';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/utils/supabaseClient';

import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import AppWelcome from '@/sections/overview/app-welcome';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import DevRoleSwitcher from '@/components/DevRoleSwitcher';

interface QuizData {
  id: string;
  status: string;
}

export default function AdminDashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  const [quizData, setQuizData] = useState<QuizData[]>([]);

  useEffect(() => {
    const fetchQuizData = async () => {
      const { data, error } = await supabase.from('quizzes').select('id, status');
      if (error) {
        console.error('Error fetching quiz data:', error.message);
      } else {
        setQuizData(data || []);
      }
    };

    fetchQuizData();
  }, []);

  const publishedCount = quizData.filter(q => q.status === 'published').length;
  const draftCount = quizData.filter(q => q.status === 'draft').length;

  return (
    <Box p={3}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <AppWelcome
          title={`Welcome back, ${user?.firstName || 'Admin'}!`}
          description="Manage quizzes, users, and platform activity from this dashboard."
          showCreateQuizButton
          createQuizAction={() => router.push('/create-quiz')}
        />
        <Box display="flex" gap={2}>
          <ThemeToggleButton />
          <DevRoleSwitcher />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <AppWidgetSummary
            title="Published Quizzes"
            total={publishedCount}
            icon="mdi:file-document-check-outline"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <AppWidgetSummary
            title="Draft Quizzes"
            total={draftCount}
            icon="mdi:file-document-edit-outline"
            color="warning"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
