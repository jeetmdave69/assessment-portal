import { Card, CardContent, Typography, Button, Box } from '@mui/material';

interface ErrorPopupProps {
  message: string;
  onClose: () => void;
}

export default function ErrorPopup({ message, onClose }: ErrorPopupProps) {
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      width="100%"
      height="100%"
      bgcolor="rgba(0,0,0,0.5)"
      display="flex"
      justifyContent="center"
      alignItems="center"
      zIndex={1300}
    >
      <Card sx={{ minWidth: 300, padding: 3, borderRadius: 2, textAlign: 'center', boxShadow: 5 }}>
        <CardContent>
          <Typography variant="h6" color="error" gutterBottom>
            ❌ Error
          </Typography>
          <Typography variant="body1" gutterBottom>
            {message}
          </Typography>
          <Button variant="contained" color="primary" onClick={onClose} sx={{ mt: 2 }}>
            Close
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
