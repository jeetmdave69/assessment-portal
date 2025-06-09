'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface QuizSubmitModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function QuizSubmitModal({
  open,
  onClose,
  onConfirm,
}: QuizSubmitModalProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Submit Quiz</DialogTitle>

      <DialogContent>
        <Typography>Are you sure you want to submit your quiz?</Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
