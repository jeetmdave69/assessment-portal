"use client";

import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Tooltip,
  TableFooter,
  TablePagination,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  CardHeader,
  Avatar,
} from "@mui/material";
import { useRouter } from "next/navigation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BarChartIcon from "@mui/icons-material/BarChart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useState, useEffect } from "react";
import { supabase } from "src/lib/supabaseClient";

type Quiz = {
  id: number;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  attempts: number;
  access_code: string;
  description?: string;
  created_at?: string;
};

export default function QuizTable({ quizzes = [] }: { quizzes?: Quiz[] }) {
  const router = useRouter();
  const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 4;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const regenerateCode = async (id: number) => {
    const newCode = generateAccessCode();
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ access_code: newCode })
        .eq("id", id);
      if (error) throw error;
      fetchQuizzes();
    } catch (error) {
      console.error("Error regenerating code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (quiz: Quiz) => {
    console.log("Delete clicked for quiz:", quiz);
    setQuizToDelete(quiz);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;
    setIsDeleting(true);
    try {
      const { error: qErr } = await supabase.from("questions").delete().eq("quiz_id", quizToDelete.id);
      console.log("Questions delete error:", qErr);
      const { error } = await supabase.from("quizzes").delete().eq("id", quizToDelete.id);
      console.log("Quiz delete error:", error);
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error("Error deleting quiz:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setQuizToDelete(null);
  };

  useEffect(() => {
    if (quizzes.length > 0) {
      setLocalQuizzes(quizzes);
    } else {
      fetchQuizzes();
    }
  }, [quizzes]);

  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLocalQuizzes((data as Quiz[]) || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const getCurrentPageQuizzes = () => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return localQuizzes.slice(startIndex, endIndex);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success.main";
      case "draft":
        return "warning.main";
      case "completed":
        return "info.main";
      case "pending":
        return "text.secondary";
      default:
        return "text.secondary";
    }
  };

  console.log("Dialog open?", deleteDialogOpen, quizToDelete);

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Quiz Management
      </Typography>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Quiz Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Timing</TableCell>
              <TableCell>Attempts</TableCell>
              <TableCell>Access Code</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : getCurrentPageQuizzes().length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No quizzes found. Create your first quiz to get started.
                </TableCell>
              </TableRow>
            ) : (
              getCurrentPageQuizzes().map((quiz) => (
                <TableRow key={quiz.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>
                      {quiz.title || "Untitled Quiz"}
                    </Typography>
                    {quiz.description && (
                      <Typography variant="body2" color="text.secondary">
                        {quiz.description.length > 50
                          ? `${quiz.description.substring(0, 50)}...`
                          : quiz.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography color={getStatusColor(quiz.status)}>
                      {quiz.status || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {quiz.start_time
                        ? new Date(quiz.start_time).toLocaleString()
                        : "—"}
                    </Typography>
                    {quiz.end_time && (
                      <Typography variant="body2" color="text.secondary">
                        to {new Date(quiz.end_time).toLocaleString()}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{quiz.attempts || 0}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontFamily="monospace">
                        {quiz.access_code || "—"}
                      </Typography>
                      <Tooltip title="Regenerate Code">
                        <IconButton
                          size="small"
                          onClick={() => regenerateCode(quiz.id)}
                          disabled={isLoading}
                        >
                          <AutorenewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        onClick={() => router.push(`/edit-quiz/${quiz.id}`)}
                      >
                        <EditIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Preview">
                      <IconButton
                        onClick={() => router.push(`/preview-quiz/${quiz.id}`)}
                      >
                        <VisibilityIcon color="info" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Results">
                      <IconButton
                        onClick={() => router.push(`/results/${quiz.id}`)}
                      >
                        <BarChartIcon color="secondary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => { console.log("Test click"); alert("Clicked!"); }}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={[4]}
                colSpan={6}
                count={localQuizzes.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} of ${count}`
                }
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {/* Custom Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <Card>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: "error.main" }}>
                <DeleteIcon />
              </Avatar>
            }
            title="Delete Quiz"
            subheader="This action cannot be undone"
          />
          <CardContent>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to permanently delete the quiz:
            </Typography>
            <Typography variant="h6" component="div" gutterBottom>
              "{quizToDelete?.title || "Untitled Quiz"}"
            </Typography>
            {quizToDelete?.description && (
              <Typography variant="body2" color="text.secondary">
                {quizToDelete.description}
              </Typography>
            )}
          </CardContent>
          <DialogActions sx={{ padding: 2 }}>
            <Button
              onClick={handleDeleteCancel}
              variant="outlined"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={isDeleting}
              startIcon={
                isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />
              }
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogActions>
        </Card>
      </Dialog>
    </Box>
  );
}