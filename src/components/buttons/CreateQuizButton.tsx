'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function CreateQuizButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/create-quiz')}
      startIcon={<AddIcon />}
      sx={{
        borderRadius: 2,
        px: 3,
        py: 1.5,
        fontWeight: 600,
        fontSize: '1rem',
        textTransform: 'none',
        background: 'linear-gradient(135deg, #1e293b, #3b82f6)', // Dark navy to blue
        color: '#fff',
        boxShadow: 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          background: 'linear-gradient(135deg, #1e293b, #2563eb)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      Create New Quiz
    </Button>
  );
}
