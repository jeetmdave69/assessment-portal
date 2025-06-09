'use client';

import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';

interface QuizTimerProps {
  duration: number; // in seconds
  onTimeUp: () => void;
}

export default function QuizTimer({ duration, onTimeUp }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Typography variant="h6" color={timeLeft < 60 ? 'error' : 'text.primary'}>
      ⏳ Time Left: {formatTime(timeLeft)}
    </Typography>
  );
}
