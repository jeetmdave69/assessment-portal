import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface QuizOption {
  text: string;
  image?: string | null;
  isCorrect: boolean;
}

interface QuestionAccordionProps {
  q: { question: string; explanation?: string };
  i: number;
  opts: QuizOption[];
}

const QuestionAccordion: React.FC<QuestionAccordionProps> = ({ q, i, opts }) => {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={600}>
          Q{i + 1}: {q.question}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <List>
          {opts.map((opt, idx) => (
            <ListItem key={idx}>
              <ListItemText
                primary={opt.text}
                secondary={opt.isCorrect ? 'Correct' : ''}
              />
            </ListItem>
          ))}
        </List>
        {q.explanation && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Explanation: {q.explanation}
            </Typography>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default QuestionAccordion; 