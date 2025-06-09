'use client';

import { useState } from 'react';
import { Container, Button, Stack } from '@mui/material';
import QuizQuestion from '@/components/quiz/QuizQuestion';
import QuizTimer from '@/components/quiz/QuizTimer';
import QuizSubmitModal from '@/components/quiz/QuizSubmitModal';

export default function TestComponentsPage() {
  const [answers, setAnswers] = useState<string[] | string>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);

  const mockQuestion = {
    id: 'q1',
    type: 'mcq',
    allow_multiple: true,
    question: 'Which of these are fruits?',
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Carrot', value: 'carrot' },
      { label: 'Banana', value: 'banana' },
      { label: 'Potato', value: 'potato' },
    ],
    image_url: '',
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <QuizTimer duration={60} onTimeUp={() => setQuizEnded(true)} />

        {!quizEnded && (
          <QuizQuestion
            question={mockQuestion}
            selectedAnswers={answers}
            onAnswerChange={setAnswers}
          />
        )}

        <Button variant="contained" color="primary" onClick={() => setModalOpen(true)}>
          Open Submit Modal
        </Button>

        <QuizSubmitModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={() => {
            setModalOpen(false);
            alert('Submitted!');
          }}
        />
      </Stack>
    </Container>
  );
}
