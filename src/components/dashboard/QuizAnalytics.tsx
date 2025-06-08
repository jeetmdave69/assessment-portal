'use client';

import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';

type AttemptData = {
  created_at: string;
};

type ChartPoint = {
  date: string;
  attempts: number;
};

export default function QuizAnalytics() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const { data, error } = await supabase.from('attempts').select('created_at');

        if (error || !data) {
          console.error('❌ Error fetching attempts:', error?.message || 'Unknown error');
          setErrorMsg(error?.message || 'Failed to fetch attempt data.');
          return;
        }

        const grouped = data.reduce<Record<string, number>>((acc, cur: AttemptData) => {
          const day = new Date(cur.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          });
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {});

        const formatted: ChartPoint[] = Object.keys(grouped)
          .map((key) => ({
            date: key,
            attempts: grouped[key],
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(formatted);
      } catch (err: any) {
        console.error('❌ Unexpected error fetching attempts:', err.message);
        setErrorMsg(err.message || 'Unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorMsg) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {errorMsg}
      </Alert>
    );
  }

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Quiz Attempts Over Time
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        {data.length === 0 ? (
          <Typography>No attempts yet.</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attempts"
                stroke="#1976d2"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
}
