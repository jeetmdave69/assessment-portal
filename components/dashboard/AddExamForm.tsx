import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

export default function AddExamForm() {
  const [form, setForm] = useState({
    quiz_title: '',
    nq: '',
    description: '',
    subt: '',
    duration: '',
    subject: '',
    extime: '',
    subt_time: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { quiz_title, nq, description, subt, duration, subject, extime, subt_time } = form;
    const { data, error } = await supabase.from('quizzes').insert([{
      quiz_title,
      nq: Number(nq),
      description,
      subt,
      duration: Number(duration),
      subject,
      extime,
      subt_time
    }]).select();
    setLoading(false);
    if (error) {
      setError('Adding exam failed.');
    } else if (data && data.length > 0) {
      // Redirect to add questions for this quiz
      router.push(`/dashboard/teacher/add-questions?quizId=${data[0].id}&nq=${nq}`);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" mb={2}>Add New Exam</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}><TextField label="Exam Name" name="quiz_title" value={form.quiz_title} onChange={handleChange} fullWidth required /></Grid>
          <Grid item xs={12}><TextField label="Number of Questions" name="nq" value={form.nq} onChange={handleChange} type="number" fullWidth required /></Grid>
          <Grid item xs={12}><TextField label="Description" name="description" value={form.description} onChange={handleChange} fullWidth /></Grid>
          <Grid item xs={12}><TextField label="Subtitle" name="subt" value={form.subt} onChange={handleChange} fullWidth /></Grid>
          <Grid item xs={12}><TextField label="Exam time" name="extime" value={form.extime} onChange={handleChange} type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12}><TextField label="Submission time" name="subt_time" value={form.subt_time} onChange={handleChange} type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12}><TextField label="Duration (minutes)" name="duration" value={form.duration} onChange={handleChange} type="number" fullWidth required /></Grid>
          <Grid item xs={12}><TextField label="Subject" name="subject" value={form.subject} onChange={handleChange} fullWidth /></Grid>
        </Grid>
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 3 }} disabled={loading}>
          {loading ? 'Adding...' : 'Add Exam'}
        </Button>
      </form>
    </Paper>
  );
} 