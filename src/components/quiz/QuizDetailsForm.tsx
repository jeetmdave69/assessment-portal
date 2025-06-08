"use client";

import {
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
} from "@mui/material";
import { useFormContext, Controller } from "react-hook-form";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";

export default function QuizDetailsForm() {
  const { control } = useFormContext();

  return (
    <Grid container spacing={2} mt={2}>
      <Grid item xs={12}>
        <Controller
          name="quizTitle"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Quiz Title" fullWidth required />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="totalMarks"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Total Marks"
              fullWidth
              required
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="duration"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Duration (mins)"
              fullWidth
              required
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="startDateTime"
          control={control}
          render={({ field }) => (
            <DateTimePicker
              label="Start Date & Time"
              value={dayjs(field.value)}
              onChange={(value) => field.onChange(value?.toDate())}
              slotProps={{ textField: { fullWidth: true } }}
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="expiryDateTime"
          control={control}
          render={({ field }) => (
            <DateTimePicker
              label="Expiry Date & Time"
              value={dayjs(field.value)}
              onChange={(value) => field.onChange(value?.toDate())}
              slotProps={{ textField: { fullWidth: true } }}
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="maxAttempts"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Max Attempts"
              fullWidth
              required
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="previewMode"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Enable Preview Mode"
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="shuffleQuestions"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Shuffle Questions"
            />
          )}
        />
      </Grid>

      <Grid item xs={6}>
        <Controller
          name="shuffleOptions"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Shuffle Options"
            />
          )}
        />
      </Grid>
    </Grid>
  );
}
