import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const QuizNavigation: React.FC = () => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} color="primary" mb={1}>
        Quiz Navigation
      </Typography>
      <Box color="text.secondary">
        {/* Add navigation controls here in the future */}
        This is a placeholder for quiz navigation controls.
      </Box>
    </Paper>
  );
};

export default QuizNavigation; 