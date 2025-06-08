// File: src/components/quiz/QuestionList.tsx
"use client";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { useEffect, useState } from "react";

export default function QuestionList() {
  const { control, register, setValue, watch } = useFormContext();
  const { fields: questionFields, append } = useFieldArray({ name: "questions", control });
  const watchedQuestions = watch("questions");

  const handleAddQuestion = () => {
    append({
      question: "",
      image: null,
      explanation: "",
      options: [
        { text: "", image: null, isCorrect: false },
        { text: "", image: null, isCorrect: false },
        { text: "", image: null, isCorrect: false },
        { text: "", image: null, isCorrect: false },
      ],
    });
  };

  return (
    <>
      {questionFields.map((question, qIndex) => (
        <Accordion key={question.id} defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Question {qIndex + 1}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              label="Question"
              {...register(`questions.${qIndex}.question`)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setValue(`questions.${qIndex}.image`, file);
              }}
            />

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {watchedQuestions[qIndex]?.options?.map((opt: any, oIndex: number) => (
                <Grid item xs={12} sm={6} key={oIndex}>
                  <TextField
                    label={`Option ${oIndex + 1}`}
                    {...register(`questions.${qIndex}.options.${oIndex}.text`)}
                    fullWidth
                    sx={{ mb: 1 }}
                  />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setValue(`questions.${qIndex}.options.${oIndex}.image`, file);
                    }}
                  />

                  <FormControlLabel
                    control={
                      <Controller
                        name={`questions.${qIndex}.options.${oIndex}.isCorrect`}
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                    }
                    label="Correct Answer"
                  />
                </Grid>
              ))}
            </Grid>

            <TextField
              label="Explanation (optional)"
              {...register(`questions.${qIndex}.explanation`)}
              multiline
              rows={3}
              fullWidth
              sx={{ mt: 2 }}
            />
          </AccordionDetails>
        </Accordion>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddQuestion}
        sx={{ mt: 3 }}
      >
        Add Question
      </Button>
    </>
  );
}
