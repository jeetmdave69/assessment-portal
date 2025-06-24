'use client';

import { Card, Typography, Box, Stack, Button } from '@mui/material';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

type AppWelcomeProps = {
  title?: string;
  description?: string;
  img?: string;
  role?: 'teacher' | 'student' | 'admin';
  showCreateQuizButton?: boolean; // ✅ Optional override
  createQuizAction?: () => void;  // ✅ Optional handler
};

export default function AppWelcome({
  title,
  description,
  img = '/assets/images/background-4.jpg',
  role = 'student',
  showCreateQuizButton,
  createQuizAction,
}: AppWelcomeProps) {
  const { user } = useUser();
  const router = useRouter();

  const handleCreateQuiz = useCallback(() => {
    if (createQuizAction) {
      createQuizAction();
    } else {
      router.push('/create-quiz');
    }
  }, [createQuizAction, router]);

  // ✅ Default to true for teachers, false otherwise
  const shouldShowCreateButton =
    typeof showCreateQuizButton === 'boolean'
      ? showCreateQuizButton
      : role === 'teacher';

  // Prefetch the create-quiz page for instant navigation
  useEffect(() => {
    if (router.prefetch) {
      router.prefetch('/create-quiz');
    }
  }, [router]);

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        px: { xs: 3, sm: 4 },
        py: { xs: 4, sm: 5 },
        boxShadow: 6,
        minHeight: 200,
        maxWidth: { xs: '100%', md: 1200 },
        width: '100%',
        alignSelf: 'center',
        backgroundColor: 'grey.900',
        color: 'white',
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url("${img}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.9,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Foreground Content */}
      <Stack
        spacing={2}
        sx={{
          position: 'relative',
          zIndex: 2,
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
        >
          {title || `Welcome back, ${user?.firstName || 'User'} 👋`}
        </Typography>

        <Typography variant="body2" sx={{ maxWidth: 600 }}>
          {description ||
            'Create, manage, and analyze assessments seamlessly with your personal dashboard.'}
        </Typography>

        {shouldShowCreateButton && (
          <Button
            variant="contained"
            color="success"
            onClick={handleCreateQuiz}
            disableElevation
            sx={{
              width: 'fit-content',
              px: 2.5,
              py: 0.75,
              mt: 1,
              fontWeight: 'bold',
              borderRadius: 3,
              fontSize: '1rem',
              background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
              boxShadow: '0 2px 8px rgba(56, 249, 215, 0.10)',
              transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(90deg, #38f9d7 0%, #43e97b 100%)',
                boxShadow: '0 4px 16px rgba(56, 249, 215, 0.18)',
                transform: 'translateY(-2px) scale(1.03)',
              },
            }}
            startIcon={
              <span style={{ fontWeight: 'bold', fontSize: 18, marginTop: 1 }}>+</span>
            }
          >
            Create Quiz
          </Button>
        )}
      </Stack>
    </Card>
  );
}
