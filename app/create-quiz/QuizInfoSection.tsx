import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const QuizInfoSection: React.FC = () => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} color="primary" mb={1}>
        Quiz Info
      </Typography>
      <Box color="text.secondary">
        {/* Add quiz details here in the future */}
        This is a placeholder for quiz information.
      </Box>
    </Paper>
  );
};

export default QuizInfoSection; 