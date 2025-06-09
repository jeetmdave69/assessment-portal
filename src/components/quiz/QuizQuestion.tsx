'use client';

import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Stack,
} from '@mui/material';

interface QuizQuestionProps {
  question: any;
  selectedAnswers: string[] | string;
  onAnswerChange: (value: string | string[]) => void;
}

export default function QuizQuestion({
  question,
  selectedAnswers,
  onAnswerChange,
}: QuizQuestionProps) {
  const isMCQ = question.type === 'mcq';
  const isDescriptive = question.type === 'descriptive';

  const handleMCQChange = (value: string) => {
    if (question.allow_multiple) {
      // For multi-select MCQ
      const current = Array.isArray(selectedAnswers) ? selectedAnswers : [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onAnswerChange(updated);
    } else {
      // Single answer
      onAnswerChange(value);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {question.question}
      </Typography>

      {question.image_url && (
        <Box mb={2}>
          <img src={question.image_url} alt="question" style={{ maxWidth: '100%' }} />
        </Box>
      )}

      {isMCQ && (
        <Stack spacing={1}>
          {question.options?.map((option: any, index: number) => {
            const optionKey = option.value;
            return question.allow_multiple ? (
              <FormControlLabel
                key={index}
                control={
                  <Checkbox
                    checked={Array.isArray(selectedAnswers) && selectedAnswers.includes(optionKey)}
                    onChange={() => handleMCQChange(optionKey)}
                  />
                }
                label={option.label}
              />
            ) : (
              <RadioGroup
                key={index}
                value={selectedAnswers}
                onChange={(e) => onAnswerChange(e.target.value)}
              >
                <FormControlLabel value={optionKey} control={<Radio />} label={option.label} />
              </RadioGroup>
            );
          })}
        </Stack>
      )}

      {isDescriptive && (
        <TextField
          fullWidth
          multiline
          rows={4}
          value={selectedAnswers as string}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Write your answer here..."
        />
      )}
    </Box>
  );
}
