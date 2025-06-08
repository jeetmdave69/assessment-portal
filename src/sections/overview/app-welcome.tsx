'use client';

import { Card, Typography, Box, Stack, Button } from '@mui/material';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export default function AppWelcome() {
  const { user } = useUser();
  const router = useRouter();

  // ✅ useCallback ensures stable reference
  const handleCreateQuiz = useCallback(() => {
    router.push('/create-quiz');
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
        width: '100%',
        maxWidth: 700,
        ml: 0,
        cursor: 'default', // Prevents click propagation from card
      }}
    >
      {/* Background Image - with pointerEvents none to prevent interference */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url("/assets/images/background-4.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.95,
          zIndex: 0,
          pointerEvents: 'none', // ✅ Prevents accidental overlay click blocking
        }}
      />

      {/* Foreground Content */}
      <Stack
        spacing={2}
        sx={{
          position: 'relative',
          zIndex: 2,
          color: 'white',
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
        >
          Welcome back, {user?.firstName || 'User'} 👋
        </Typography>

        <Typography variant="body2" sx={{ maxWidth: 600 }}>
          Create, manage, and analyze assessments seamlessly with your personal dashboard.
        </Typography>

        <Button
          type="button"
          variant="contained"
          color="primary"
          onClick={handleCreateQuiz}
          disableElevation
          sx={{
            width: 'fit-content',
            px: 3,
            py: 1,
            mt: 1,
            fontWeight: 'bold',
            borderRadius: 2,
            zIndex: 2,
          }}
        >
          Create Quiz
        </Button>
      </Stack>
    </Card>
  );
}
