'use client';

import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Tooltip,
  Stack,
} from '@mui/material';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import { supabase } from '@/utils/supabaseClient';

interface Quiz {
  id: number;
  title: string;
  is_draft?: boolean;
  start_time: string;
  attempts?: number;
  access_code: string;
}

interface QuizTableProps {
  quizzes: Quiz[];
}

export default function QuizTable({ quizzes }: QuizTableProps) {
  const router = useRouter();
  const [quizData, setQuizData] = useState<Quiz[]>(quizzes);

  // Setup real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('quizzes-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quizzes' },
        (payload) => {
          console.log('🔄 Real-time event:', payload);

          if (payload.eventType === 'DELETE') {
            setQuizData((prev) => prev.filter((quiz) => quiz.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            setQuizData((prev) => [...prev, payload.new as Quiz]);
          } else if (payload.eventType === 'UPDATE') {
            setQuizData((prev) =>
              prev.map((quiz) =>
                quiz.id === payload.new.id ? { ...quiz, ...payload.new } : quiz
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const deleteQuiz = async (id: number) => {
    const confirmDelete = confirm('Are you sure you want to delete this quiz and its questions?');
    if (!confirmDelete) return;

    try {
      const { error: deleteQuestionsError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', id);

      if (deleteQuestionsError) {
        console.error('❌ Failed to delete related questions:', deleteQuestionsError.message);
        alert('Failed to delete quiz questions.');
        return;
      }

      const { error: deleteQuizError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

      if (deleteQuizError) {
        console.error('❌ Error deleting quiz:', deleteQuizError.message);
        alert('Failed to delete quiz.');
        return;
      }

      alert('✅ Quiz deleted successfully!');
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      alert('Unexpected error occurred while deleting quiz.');
    }
  };

  const regenerateCode = async (id: number) => {
    const newCode = generateAccessCode();
    const { error } = await supabase
      .from('quizzes')
      .update({ access_code: newCode })
      .eq('id', id);

    if (error) {
      console.error('❌ Error regenerating access code:', error.message || error);
    } else {
      alert('✅ Access code regenerated!');
    }
  };

  const generateAccessCode = () => {
    return `${randomCode(4)}-${randomCode(4)}`;
  };

  const randomCode = (length: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  return (
    <Box mt={4}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Quiz Management
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Quiz Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Attempts</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Access Code</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {quizData.length > 0 ? (
              quizData.map((quiz) => (
                <TableRow
                  key={quiz.id}
                  hover
                  sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}
                >
                  <TableCell>{quiz.title || 'Untitled Quiz'}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={quiz.is_draft ? 'text.secondary' : 'success.main'}
                    >
                      {quiz.is_draft ? 'Draft' : 'Published'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {quiz.start_time ? new Date(quiz.start_time).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{quiz.attempts ?? 0}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontFamily="monospace">
                        {quiz.access_code || '—'}
                      </Typography>
                      <Tooltip title="Regenerate Code">
                        <IconButton size="small" onClick={() => regenerateCode(quiz.id)}>
                          <AutorenewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() => router.push(`/edit-quiz/${quiz.id}`)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Preview">
                        <IconButton
                          color="info"
                          onClick={() => router.push(`/preview-quiz/${quiz.id}`)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Results">
                        <IconButton
                          color="secondary"
                          onClick={() =>
                            router.push(`/dashboard/teacher/quiz-results/${quiz.id}`)
                          }
                        >
                          <BarChartIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => deleteQuiz(quiz.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Stack direction="column" alignItems="center" spacing={1}>
                    <SentimentDissatisfiedIcon color="disabled" fontSize="large" />
                    <Typography variant="body1" color="text.secondary">
                      No quizzes found.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
