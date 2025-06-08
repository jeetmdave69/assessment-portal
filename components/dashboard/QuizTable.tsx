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
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BarChartIcon from "@mui/icons-material/BarChart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AutorenewIcon from "@mui/icons-material/Autorenew";

// ✅ Type for a quiz row
type Quiz = {
  id: number;
  title: string;
  status: string;
  start_time: string;
  attempts: number;
  access_code: string;
};

export default function QuizTable() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const router = useRouter();

  const fetchQuizzes = async () => {
    try {
      console.log("Fetching quizzes...");
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching quizzes:", error.message);
        throw new Error(error.message); // Throw error for better handling
      }

      console.log("Fetched quizzes:", data);
      setQuizzes((data as Quiz[]) || []);
    } catch (error: any) {
      console.error("❌ Error fetching quizzes:", error.message);
    }
  };

  const deleteQuiz = async (id: number) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (!error) fetchQuizzes();
    }
  };

  const regenerateCode = async (id: number) => {
    const newCode = generateAccessCode();
    const { error } = await supabase
      .from("quizzes")
      .update({ access_code: newCode })
      .eq("id", id);
    if (!error) fetchQuizzes();
  };

  const generateAccessCode = () => {
    return `${randomCode(4)}-${randomCode(4)}`;
  };

  const randomCode = (length: number) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Quiz Management
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Quiz Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Attempts</TableCell>
              <TableCell>Access Code</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quizzes.map((quiz) => (
              <TableRow key={quiz.id}>
                <TableCell>{quiz.title || "Untitled Quiz"}</TableCell>
                <TableCell>{quiz.status || "-"}</TableCell>
                <TableCell>
                  {quiz.start_time
                    ? new Date(quiz.start_time).toLocaleString()
                    : "—"}
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
                      >
                        <AutorenewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => router.push(`/edit-quiz/${quiz.id}`)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Preview">
                    <IconButton onClick={() => router.push(`/preview-quiz/${quiz.id}`)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Results">
                    <IconButton onClick={() => router.push(`/results/${quiz.id}`)}>
                      <BarChartIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete">
                    <IconButton onClick={() => deleteQuiz(quiz.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {quizzes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No quizzes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
