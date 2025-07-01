import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, Alert, MenuItem } from '@mui/material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

export default function AddQuestionsForm({ quizId, nq }: { quizId: number, nq: number }) {
  const [questions, setQuestions] = useState(
    Array.from({ length: nq }, () => ({
      question_text: '',
      options: ['', '', '', ''],
      answer: 0
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (idx: number, field: string, value: string | number) => {
    setQuestions(qs => {
      const updated = [...qs];
      if (field === 'question_text') updated[idx].question_text = value as string;
      else if (field.startsWith('option')) updated[idx].options[Number(field.slice(-1))] = value as string;
      else if (field === 'answer') updated[idx].answer = Number(value);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const inserts = questions.map((q, i) => ({
      quiz_id: quizId,
      question_text: q.question_text,
      options: q.options.map((text, idx) => ({
        text,
        isCorrect: q.answer === idx + 1
      })),
      sno: i + 1
    }));
    const { error } = await supabase.from('questions').insert(inserts);
    setLoading(false);
    if (error) {
      setError('Updating questions failed.');
    } else {
      router.push('/dashboard/teacher?tab=exams');
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" mb={2}>Add Questions</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {questions.map((q, idx) => (
            <Grid item xs={12} key={idx}>
              <Typography fontWeight={600} mb={1}>Question {idx + 1}</Typography>
              <TextField label="Question Text" value={q.question_text} onChange={e => handleChange(idx, 'question_text', e.target.value)} fullWidth required sx={{ mb: 1 }} />
              <Grid container spacing={1}>
                {[0, 1, 2, 3].map(optIdx => (
                  <Grid item xs={12} sm={6} md={3} key={optIdx}>
                    <TextField
                      label={`Option ${optIdx + 1}`}
                      value={q.options[optIdx]}
                      onChange={e => handleChange(idx, `option${optIdx}`, e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                ))}
              </Grid>
              <TextField
                select
                label="Correct Option"
                value={q.answer}
                onChange={e => handleChange(idx, 'answer', e.target.value)}
                fullWidth
                required
                sx={{ mt: 1 }}
              >
                <MenuItem value={0} disabled>Select correct option</MenuItem>
                {[1, 2, 3, 4].map(opt => (
                  <MenuItem key={opt} value={opt}>{`Option ${opt}`}</MenuItem>
                ))}
              </TextField>
            </Grid>
          ))}
        </Grid>
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 3 }} disabled={loading}>
          {loading ? 'Adding...' : 'Add Questions'}
        </Button>
      </form>
    </Paper>
  );
} 