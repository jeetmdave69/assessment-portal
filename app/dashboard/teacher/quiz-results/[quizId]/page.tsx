'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { supabase } from '@/utils/supabaseClient';

interface Attempt {
  id: number;
  quiz_id: number;
  user_id: string;
  user_name: string;
  score: number;
  submitted_at: string;
}

export default function QuizResultsPage() {
  const { quizId } = useParams() as { quizId: string };
  const router = useRouter();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editScore, setEditScore] = useState<number>(0);
  const [editingAttemptId, setEditingAttemptId] = useState<number | null>(null);

  useEffect(() => {
    if (!quizId) return;

    async function fetchAttempts() {
      setLoading(true);

      const { data, error } = await supabase
        .from('attempts')
        .select(`
          id,
          quiz_id,
          user_id,
          user_name,
          score,
          submitted_at
        `)
        .eq('quiz_id', Number(quizId))
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching attempts:', error);
        setAttempts([]);
      } else {
        setAttempts(data || []);
      }

      setLoading(false);
    }

    fetchAttempts();
  }, [quizId]);

  const avgScore =
    attempts.length > 0
      ? attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length
      : 0;

  const handleOpenEdit = (attemptId: number, currentScore: number) => {
    setEditingAttemptId(attemptId);
    setEditScore(currentScore);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editingAttemptId === null) return;

    const { error } = await supabase
      .from('attempts')
      .update({ score: editScore })
      .eq('id', editingAttemptId);

    if (error) {
      alert('Failed to update score');
      console.error(error);
    } else {
      setAttempts((prev) =>
        prev.map((a) => (a.id === editingAttemptId ? { ...a, score: editScore } : a))
      );
      setEditOpen(false);
      setEditingAttemptId(null);
    }
  };

  if (loading) {
    return (
      <Box height="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Quiz Results for Quiz ID: {quizId}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        Total Attempts: {attempts.length}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        Average Score: {avgScore.toFixed(2)}
      </Typography>

      {attempts.length === 0 ? (
        <Typography sx={{ mt: 3 }}>No attempts found for this quiz yet.</Typography>
      ) : (
        <Paper elevation={3} sx={{ mt: 3, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Attempt ID</TableCell>
                <TableCell>User Name</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>{attempt.id}</TableCell>
                  <TableCell>{attempt.user_name}</TableCell>
                  <TableCell>{attempt.score}</TableCell>
                  <TableCell>{new Date(attempt.submitted_at).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => router.push(`/result/${attempt.id}`)}
                      sx={{ mr: 1 }}
                    >
                      View Submission
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleOpenEdit(attempt.id, attempt.score)}
                    >
                      Edit Score
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Score</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="New Score"
            type="number"
            fullWidth
            value={editScore}
            onChange={(e) => setEditScore(parseInt(e.target.value, 10))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
