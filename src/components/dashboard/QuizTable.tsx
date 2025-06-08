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
} from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useUser } from '@clerk/nextjs';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AutorenewIcon from '@mui/icons-material/Autorenew';

type Quiz = {
  id: number;
  quiz_name: string;
  is_draft?: boolean;
  start_time: string;
  attempts?: number;
  access_code: string;
};

export default function QuizTable() {
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

const fetchQuizzes = async () => {
  if (!user?.id) return;

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('creator_id', user.id) // ✅ This line filters by Clerk user ID
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching quizzes:', error.message || error);
  } else {
    setQuizzes(data || []);
  }
};


  const deleteQuiz = async (id: number) => {
    const confirmDelete = confirm('Are you sure you want to delete this quiz?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      console.error('❌ Error deleting quiz:', error.message || error);
    } else {
      fetchQuizzes();
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
      fetchQuizzes();
    }
  };

  const generateAccessCode = () => {
    return `${randomCode(4)}-${randomCode(4)}`;
  };

  const randomCode = (length: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  useEffect(() => {
    fetchQuizzes();
  }, [user?.id]);

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Quiz Management
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Quiz Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Attempts</TableCell>
              <TableCell>Access Code</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>{quiz.quiz_name || 'Untitled Quiz'}</TableCell>
                  <TableCell>{quiz.is_draft ? 'Draft' : 'Published'}</TableCell>
                  <TableCell>
                    {quiz.start_time
                      ? new Date(quiz.start_time).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell>{quiz.attempts || 0}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontFamily="monospace">
                        {quiz.access_code || '—'}
                      </Typography>
                      <Tooltip title="Regenerate Code">
                        <IconButton
                          size="small"
                          onClick={() => regenerateCode(quiz.id)}
                        >
                          <AutorenewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        onClick={() =>
                          window.location.assign(`/edit-quiz/${quiz.id}`)
                        }
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Preview">
                      <IconButton
                        onClick={() =>
                          window.location.assign(`/preview-quiz/${quiz.id}`)
                        }
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Results">
                      <IconButton
                        onClick={() =>
                          window.location.assign(`/results/${quiz.id}`)
                        }
                      >
                        <BarChartIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete">
                      <IconButton onClick={() => deleteQuiz(quiz.id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No quizzes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
