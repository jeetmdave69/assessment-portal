'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  FormGroup,
} from '@mui/material';
import { useForm, FormProvider, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { quizSchema, QuizFormValues } from '@/schemas/quizSchema';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useThemeMode } from '@/providers/ThemeModeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Slide from '@mui/material/Slide';
import React from 'react';

interface QuizOption {
  text: string;
  image?: string | null;
  isCorrect: boolean;
}

interface QuizQuestion {
  question: string;
  questionType: 'single' | 'multiple';
  image?: string | null;
  explanation?: string;
  marks: string;
  options: QuizOption[];
  section: string;
}

interface QuizResponse {
  id: string;
  access_code: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadImageToSupabase(file: File, pathPrefix: string): Promise<string> {
  const fileName = `${pathPrefix}/${uuidv4()}-${file.name}`;
  const { error } = await supabase.storage.from('quiz-option-images').upload(fileName, file);
  if (error) throw error;
  return supabase.storage.from('quiz-option-images').getPublicUrl(fileName).data.publicUrl;
}

const ModernDateTimePicker = ({ 
  label, 
  value, 
  onChange 
}: {
  label: string;
  value: Date;
  onChange: (date: Date | null) => void;
}) => (
  <DateTimePicker
    label={label}
    value={dayjs(value)}
    onChange={(newValue) => onChange(newValue?.toDate() || null)}
    slotProps={{
      textField: {
        fullWidth: true,
        variant: 'outlined',
        sx: { 
          '& .MuiInputBase-root': { height: '56px' },
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': { borderColor: 'primary.main' }
          }
        }
      },
      popper: {
        sx: {
          '& .MuiPaper-root': {
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
          }
        }
      }
    }}
  />
);

export default function CreateQuizPage() {
  const { mode, toggleMode } = useThemeMode();
  const { isLoaded, isSignedIn, user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });
  const [uploadingImageIndex, setUploadingImageIndex] = useState<{q: number, o: number} | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const autoSaveKey = 'createQuizDraft';
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [sections, setSections] = useState<string[]>(["Section 1"]);
  const [newSection, setNewSection] = useState("");
  const [addSectionDialog, setAddSectionDialog] = useState<{ open: boolean; qIndex: number | null }>({ open: false, qIndex: null });
  const [inlineNewSection, setInlineNewSection] = useState("");

  const router = useRouter();

  const methods = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      quizTitle: '',
      description: '',
      totalMarks: '0',
      duration: '0',
      startDateTime: dayjs().toDate(),
      expiryDateTime: dayjs().add(1, 'day').toDate(),
      shuffleQuestions: false,
      shuffleOptions: false,
      maxAttempts: '1',
      previewMode: false,
      showCorrectAnswers: false,
      passingScore: '0',
      questions: [
        {
          question: '',
          questionType: 'single',
          image: null,
          explanation: '',
          marks: '1',
          options: [
            { text: '', image: null, isCorrect: false },
            { text: '', image: null, isCorrect: false },
          ],
          section: sections[0] || "Section 1",
        },
      ],
    },
  });

  const { control, register, handleSubmit, setValue, watch, reset, formState: { errors } } = methods;
  const { fields: questionFields, append, remove, move } = useFieldArray({ control, name: 'questions' });
  const quizTitle = useWatch({ control, name: 'quizTitle' });

  // Debounced auto-save
  const lastSaved = useRef<string>('');
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      const values = methods.getValues();
      const serialized = JSON.stringify(values);
      if (serialized !== lastSaved.current) {
        localStorage.setItem(autoSaveKey, serialized);
        lastSaved.current = serialized;
      }
    }, 15000); // 15s
    return () => clearInterval(interval);
  }, [mounted]);

  useEffect(() => setMounted(true), []);

  // Auto-save draft to localStorage every 5 seconds
  useEffect(() => {
    if (!mounted) return;
    autoSaveTimer.current = setInterval(() => {
      const values = methods.getValues();
      localStorage.setItem(autoSaveKey, JSON.stringify(values));
    }, 5000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [mounted]);

  // Restore draft on mount
  useEffect(() => {
    if (!mounted) return;
    const draft = localStorage.getItem(autoSaveKey);
    if (draft) {
      try {
        reset(JSON.parse(draft));
        setRestoredDraft(true);
      } catch (error) {
        console.error('Error restoring draft:', error);
      }
    }
  }, [reset]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ open: true, msg, type });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const parsedQuestions: QuizQuestion[] = result.data.map((row: any) => {
            const correctAnswers = (row.correct_answers || '').split(';').map((s: string) => s.trim()).filter(Boolean);
            const questionType = correctAnswers.length > 1 ? 'multiple' : 'single';
            const options = [1, 2, 3, 4]
              .map((i) => {
                const optionText = (row[`option${i}`] || '').trim();
                const isCorrect = correctAnswers.includes(optionText);
                return {
                  text: optionText,
                  image: null,
                  isCorrect: isCorrect,
                };
              })
              .filter(opt => opt.text);
            const question = {
              section: row.section ? row.section.trim() : sections[0] || "Section 1",
              question: row.question || '',
              questionType: questionType as 'single' | 'multiple',
              explanation: row.explanation || '',
              marks: row.marks || '1',
              image: null,
              options: options.length >= 2 ? options : [
                { text: '', image: null, isCorrect: false },
                { text: '', image: null, isCorrect: false },
              ]
            };
            return question;
          });
          // Debug: log parsed questions
          console.log('Parsed CSV questions:', parsedQuestions);
          // Validate all required fields
          const invalid = parsedQuestions.find(q =>
            !q.question.trim() ||
            !q.section.trim() ||
            !q.marks ||
            !q.options || q.options.length < 2 ||
            !q.options.some(opt => opt.isCorrect)
          );
          if (invalid) {
            showToast('CSV is missing required fields or has invalid data. Each question must have text, section, marks, at least 2 options, and at least 1 correct answer.', 'error');
            return;
          }
          // Add any new sections from CSV
          const csvSections = Array.from(new Set(parsedQuestions.map(q => q.section)));
          setSections(prev => Array.from(new Set([...prev, ...csvSections])));
          // Clear existing questions first
          reset({ ...methods.getValues(), questions: [] });
          setTimeout(() => {
            setValue('questions', parsedQuestions);
            // Automatically update totalMarks to sum of all question marks
            const total = parsedQuestions.reduce((sum, q) => sum + parseInt(q.marks), 0);
            setValue('totalMarks', total.toString());
            showToast('CSV imported successfully!', 'success');
            // Optionally, force validation
            if (methods.trigger) methods.trigger();
          }, 100);
        } catch (error) {
          showToast('Invalid CSV format', 'error');
        }
      },
      error: (error) => {
        showToast('Failed to read CSV', 'error');
      },
    });
  };

  const onSubmit = async (data: QuizFormValues, isDraft: boolean) => {
    if (isSubmitting) return; // Prevent double submit
    setIsSubmitting(true); // Move this up to prevent race conditions
    if (!isLoaded || !isSignedIn || !user?.id) {
      showToast('Please sign in to create a quiz.', 'error');
      setIsSubmitting(false);
      return;
    }
    // Basic client-side validation for required fields
    if (!data.quizTitle.trim()) {
      showToast('Quiz title is required.', 'error');
      setIsSubmitting(false);
      return;
    }
    if (!data.questions || data.questions.length === 0) {
      showToast('At least one question is required to create a quiz.', 'error');
      setIsSubmitting(false);
      return;
    }
    if (data.questions.some(q => !q.question.trim())) {
      showToast('All questions must have text.', 'error');
      setIsSubmitting(false);
      return;
    }
    if (data.questions.some(q => !q.section || !q.section.trim())) {
      showToast('Each question must be assigned to a section.', 'error');
      setIsSubmitting(false);
      return;
    }
    try {
      const accessCode = uuidv4().split('-')[0];
      // 1. First create the quiz entry
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          quiz_title: data.quizTitle,
          description: data.description,
          total_marks: parseInt(data.totalMarks) || data.questions.reduce((sum, q) => sum + parseInt(q.marks), 0),
          duration: parseInt(data.duration),
          start_time: data.startDateTime.toISOString(),
          end_time: data.expiryDateTime.toISOString(),
          shuffle_questions: data.shuffleQuestions,
          shuffle_options: data.shuffleOptions,
          max_attempts: parseInt(data.maxAttempts),
          preview_mode: data.previewMode,
          show_correct_answers: data.showCorrectAnswers,
          passing_score: parseInt(data.passingScore),
          access_code: accessCode,
          is_draft: isDraft,
          user_id: user.id,
        })
        .select('id, access_code')
        .single();

      if (quizError) {
        let msg = quizError.message || 'Unknown error while creating quiz.';
        if (msg.includes('duplicate')) {
          msg = 'A quiz with similar details already exists. Try changing the title or access code.';
        } else if (msg.includes('violates')) {
          msg = 'Some required fields are missing or invalid. Please check your input.';
        } else if (msg.includes('connection')) {
          msg = 'Could not connect to the database. Please check your internet connection.';
        }
        showToast(msg, 'error');
        setIsSubmitting(false);
        return;
      }
      if (!quiz) {
        showToast('Quiz could not be created. Please try again.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Insert all unique, trimmed sections for this quiz into the sections table
      const uniqueSections = Array.from(new Set(data.questions.map(q => q.section.trim())));
      const sectionInserts = uniqueSections.map(name => ({ quiz_id: quiz.id, name }));
      let { data: insertedSections, error: sectionInsertError } = await supabase
        .from('sections')
        .insert(sectionInserts)
        .select();
      if (sectionInsertError) {
        let msg = sectionInsertError.message || 'Failed to insert sections.';
        if (msg.includes('duplicate')) {
          msg = 'Duplicate section names found. Please ensure all section names are unique.';
        }
        showToast(msg, 'error');
        setIsSubmitting(false);
        return;
      }
      // If insertedSections is empty, fetch from DB (Supabase bug workaround)
      if (!insertedSections || insertedSections.length === 0) {
        const { data: fetchedSections, error: fetchSectionsError } = await supabase
          .from('sections')
          .select('*')
          .eq('quiz_id', quiz.id);
        if (fetchSectionsError || !fetchedSections) {
          showToast('Sections could not be saved. Please try again.', 'error');
          setIsSubmitting(false);
          return;
        }
        insertedSections = fetchedSections;
      }
      // Map section name to section_id
      const sectionNameToId: Record<string, number> = {};
      for (const section of insertedSections) {
        sectionNameToId[section.name.trim()] = section.id;
      }

      // 3. Process all questions
      for (const q of data.questions) {
        // Upload question image if exists
        const questionImageUrl = q.image instanceof File 
          ? await uploadImageToSupabase(q.image, 'questions') 
          : q.image;

        // Process all option images in parallel
        const processedOptions = await Promise.all(
          q.options.map(async (opt) => ({
            text: opt.text,
            image: opt.image instanceof File 
              ? await uploadImageToSupabase(opt.image, 'options') 
              : opt.image,
            is_correct: opt.isCorrect,
          }))
        );

        // Prepare correct answers array (indices of correct options)
        const correctAnswers = processedOptions
          .map((opt, index) => opt.is_correct ? index : null)
          .filter(index => index !== null);

        // Insert question with all data, using section_id
        const { error: questionError } = await supabase
          .from('questions')
          .insert({
            quiz_id: quiz.id,
            question_text: q.question,
            question_type: q.questionType,
            explanation: q.explanation,
            marks: parseInt(q.marks),
            image_url: questionImageUrl,
            options: processedOptions,
            correct_answers: correctAnswers,
            section_id: sectionNameToId[q.section.trim()],
            blank_answers: null,
            matching_pairs: null
          });

        if (questionError) {
          let msg = questionError.message || 'Failed to add a question.';
          if (msg.includes('violates')) {
            msg = 'Some question fields are missing or invalid. Please check all questions.';
          }
          showToast(msg, 'error');
          setIsSubmitting(false);
          return;
        }
      }

      reset();
      if (!isDraft) {
        setAccessCode(quiz.access_code);
        setOpenDialog(true);
      }
      showToast(`Quiz ${isDraft ? 'saved as draft' : 'published'}!`, 'success');
    } catch (err: any) {
      let msg = err?.message || JSON.stringify(err) || 'Error saving quiz.';
      if (msg.includes('connection')) {
        msg = 'Could not connect to the database. Please check your internet connection.';
      } else if (msg.includes('timeout')) {
        msg = 'The request timed out. Please try again.';
      }
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionImageUpload = async (qIndex: number, optIndex: number, file: File) => {
    setUploadingImageIndex({q: qIndex, o: optIndex});
    setUploadError(null);
    try {
      const url = await uploadImageToSupabase(file, `quiz-options`);
      console.log('Option image uploaded URL:', url); // Debug log
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        setUploadError('Image upload failed: Invalid URL');
        return;
      }
      const options = [...watch(`questions.${qIndex}.options`)];
      options[optIndex].image = url;
      setValue(`questions.${qIndex}.options`, options);
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed');
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const QuestionAccordion = React.memo(function QuestionAccordion({ q, i, opts }: { q: any, i: number, opts: any[] }) {
    // Memoize expensive watch calls
    const questionText = useWatch({ control, name: `questions.${i}.question` });
    const questionType = useWatch({ control, name: `questions.${i}.questionType` });
    const sectionId = useWatch({ control, name: `questions.${i}.section` });
    const marks = useWatch({ control, name: `questions.${i}.marks` });
    const questionImage = useWatch({ control, name: `questions.${i}.image` });
    
    // Memoize section label
    const sectionLabel = React.useMemo(() => {
      return sections.includes(sectionId) ? sectionId : 'Unknown Section';
    }, [sectionId]);

    const isExpanded = expandedIndex === i;
    return (
      <Slide key={q.id} direction="up" in mountOnEnter unmountOnExit>
        <Accordion
          expanded={isExpanded}
          onChange={() => setExpandedIndex(isExpanded ? -1 : i)}
          sx={{ borderRadius: 3, boxShadow: 2, mb: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
          id={`question-accordion-${i}`}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Chip label={`Question ${i + 1}`} variant="outlined" size="medium" sx={{ fontWeight: 600, fontSize: '1.05rem', bgcolor: 'background.paper', color: 'text.primary', borderColor: 'grey.400' }} />
                <Typography fontWeight={600} sx={{ color: 'text.primary' }}>{questionText || `Question ${i + 1}`}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Chip label={sectionLabel} variant="outlined" size="small" sx={{ bgcolor: 'background.paper', color: 'text.secondary', borderColor: 'grey.300', fontWeight: 500 }} />
                <Chip label={questionType === 'multiple' ? 'Multiple' : 'Single'} variant="outlined" size="small" sx={{ bgcolor: 'background.paper', color: 'text.secondary', borderColor: 'grey.300' }} />
                <Chip label={`Marks: ${marks}`} variant="outlined" size="small" sx={{ bgcolor: 'background.paper', color: 'text.secondary', borderColor: 'grey.300' }} />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Move Up"><span><IconButton disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUpwardIcon /></IconButton></span></Tooltip>
              <Tooltip title="Move Down"><span><IconButton disabled={i === questionFields.length - 1} onClick={() => move(i, i + 1)}><ArrowDownwardIcon /></IconButton></span></Tooltip>
              <Tooltip title="Duplicate Question"><span><IconButton color="info" onClick={() => {
                const questions = methods.getValues('questions');
                const toDuplicate = { ...questions[i], options: questions[i].options.map((o: any) => ({ ...o })) };
                const newQuestions = [...questions.slice(0, i + 1), toDuplicate, ...questions.slice(i + 1)];
                reset({ ...methods.getValues(), questions: newQuestions });
              }}><AddIcon /></IconButton></span></Tooltip>
              <Tooltip title="Delete Question"><span><IconButton color="error" onClick={() => setDeleteDialog({ open: true, index: i })}><DeleteIcon /></IconButton></span></Tooltip>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {isExpanded ? (
            <Stack spacing={2}>
              <TextField label="Question" {...register(`questions.${i}.question`)} fullWidth required error={!!errors.questions?.[i]?.question} helperText={errors.questions?.[i]?.question?.message} />
              
              {/* Question image upload */}
              <Box display="flex" alignItems="center" gap={2}>
                {questionImage && typeof questionImage === 'string' && (
                  <img src={questionImage} alt="Question" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  id={`question-image-${i}`}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingImageIndex({q: i, o: -1});
                      setUploadError(null);
                      try {
                        const url = await uploadImageToSupabase(file, `quiz-questions`);
                        setValue(`questions.${i}.image`, url);
                      } catch (err: any) {
                        setUploadError(err.message || 'Image upload failed');
                      } finally {
                        setUploadingImageIndex(null);
                      }
                    }
                  }}
                />
                <label htmlFor={`question-image-${i}`}>
                  <Tooltip title="Upload Image">
                    <IconButton component="span" color="primary" disabled={!!uploadingImageIndex && uploadingImageIndex.q === i && uploadingImageIndex.o === -1}>
                      <ImageIcon />
                    </IconButton>
                  </Tooltip>
                </label>
                {uploadingImageIndex && uploadingImageIndex.q === i && uploadingImageIndex.o === -1 && <LinearProgress sx={{ width: 40, mt: 1 }} />}
                {questionImage && typeof questionImage === 'string' && (
                  <IconButton color="error" onClick={() => setValue(`questions.${i}.image`, null)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Select label="Type" value={questionType as 'single' | 'multiple'} onChange={e => setValue(`questions.${i}.questionType`, e.target.value as 'single' | 'multiple')} fullWidth>
                  <MenuItem value="single">Single Correct</MenuItem>
                  <MenuItem value="multiple">Multiple Correct</MenuItem>
                </Select>
                <TextField label="Marks" type="number" {...register(`questions.${i}.marks`)} fullWidth required error={!!errors.questions?.[i]?.marks} helperText={errors.questions?.[i]?.marks?.message} />
              </Stack>
              
              <TextField label="Explanation" {...register(`questions.${i}.explanation`)} fullWidth multiline minRows={2} error={!!errors.questions?.[i]?.explanation} helperText={errors.questions?.[i]?.explanation?.message} />
              
              {/* Enhanced Section Selection */}
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Question Section *</InputLabel>
                <Select
                    value={sectionId || sections[0]}
                  label="Question Section *"
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setAddSectionDialog({ open: true, qIndex: i });
                      } else {
                        setValue(`questions.${i}.section`, e.target.value);
                      }
                    }}
                    required
                  >
                    {sections.map((section) => (
                      <MenuItem key={section} value={section}>{section}</MenuItem>
                    ))}
                    <MenuItem value="__add_new__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>+ Add new section</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Options</Typography>
              <Stack spacing={1}>
                {opts.map((opt, j) => (
                  <Stack key={j} direction="row" spacing={2} alignItems="center" sx={{ border: opt.isCorrect ? '2px solid #1976d2' : '1px solid #eee', borderRadius: 2, p: 1, background: 'background.paper' }}>
                    <Chip label={String.fromCharCode(65 + j)} color="default" />
                    <TextField label={`Option ${j + 1}`} {...register(`questions.${i}.options.${j}.text`)} fullWidth required error={!!errors.questions?.[i]?.options?.[j]?.text} helperText={errors.questions?.[i]?.options?.[j]?.text?.message} />
                    {/* Image upload for option */}
                    <Box>
                      {opt.image && (
                        <img
                          src={opt.image}
                          alt="Option"
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 8 }}
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=No+Img';
                          }}
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        id={`option-image-${i}-${j}`}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleOptionImageUpload(i, j, file);
                        }}
                      />
                      <label htmlFor={`option-image-${i}-${j}`}>
                        <Tooltip title="Upload Image">
                          <IconButton component="span" color="primary" disabled={!!uploadingImageIndex && uploadingImageIndex.q === i && uploadingImageIndex.o === j}>
                            <ImageIcon />
                          </IconButton>
                        </Tooltip>
                      </label>
                      {uploadingImageIndex && uploadingImageIndex.q === i && uploadingImageIndex.o === j && <LinearProgress sx={{ width: 40, mt: 1 }} />}
                      {opt.image && (
                        <IconButton color="error" onClick={() => {
                          const options = [...opts];
                          options[j].image = null;
                          setValue(`questions.${i}.options`, options);
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    {questionType === 'single' ? (
                      <Tooltip title={opt.isCorrect ? 'Correct Answer' : 'Mark as Correct'}>
                        <Radio
                          checked={opt.isCorrect || false}
                          onChange={() => {
                            // Only one can be correct
                            const updated = opts.map((o, idx) => ({ ...o, isCorrect: idx === j }));
                            setValue(`questions.${i}.options`, updated);
                          }}
                          color="primary"
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title={opt.isCorrect ? 'Correct Answer' : 'Mark as Correct'}>
                        <Checkbox
                          checked={opt.isCorrect || false}
                          onChange={e => {
                            const updated = opts.map((o, idx) => idx === j ? { ...o, isCorrect: e.target.checked } : o);
                            setValue(`questions.${i}.options`, updated);
                          }}
                          color="primary"
                        />
                      </Tooltip>
                    )}
                    <Tooltip title="Delete Option"><span><IconButton color="error" onClick={() => setValue(`questions.${i}.options`, opts.filter((_, idx) => idx !== j))}><DeleteIcon /></IconButton></span></Tooltip>
                  </Stack>
                ))}
                <Button variant="outlined" onClick={() => setValue(`questions.${i}.options`, [...opts, { text: '', image: null, isCorrect: false }])} sx={{ mt: 1 }}>+ Add Option</Button>
              </Stack>
            </Stack>
            ) : null}
          </AccordionDetails>
        </Accordion>
      </Slide>
    );
  });

  if (!mounted) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Sticky Top Bar */}
        <Paper elevation={4} sx={{ position: 'sticky', top: 0, zIndex: 20, mb: 3, borderRadius: 0, p: 2, bgcolor: 'background.paper', boxShadow: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            {quizTitle || 'Create New Quiz'}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Toggle theme">
              <IconButton onClick={toggleMode}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Button onClick={() => router.push('/dashboard')} variant="outlined" color="primary">
              ← Back to Dashboard
            </Button>
          </Stack>
        </Paper>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          {/* Import Questions Section (CSV Upload) */}
          <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Import Questions
            </Typography>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50', mb: 2 }}>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.dark', bgcolor: 'grey.100' },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => document.getElementById('csv-upload-input')?.click()}
              >
                <ImageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" color="primary" fontWeight={600} mb={1}>
                  Drag & Drop or Click to Upload CSV
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Only .csv files are supported. Max 1MB.
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Select CSV File
                  <input
                    id="csv-upload-input"
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleCsvUpload}
                  />
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                Tip: You can prepare your questions in Excel, Google Sheets, or even Notepad (as plain text) and export or save as CSV.
              </Typography>
            </Paper>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <b>CSV Format:</b> section,question,option1,option2,option3,option4,correct_answers,marks,explanation<br/>
                <b>Single correct answer:</b> just the option text (e.g., <code>35</code>)<br/>
                <b>Multiple correct answers:</b> separate with a semicolon <code>;</code> (e.g., <code>7;19</code>)<br/>
                <b>Special notes:</b> For text with commas, quotes, or semicolons, use double quotes. For double quotes inside text, use two double quotes (<code>""</code>).<br/>
                <b>Example:</b>
              </Typography>
              <Box component="pre" sx={{ fontSize: '0.85rem', bgcolor: 'grey.100', p: 1, borderRadius: 1, overflowX: 'auto' }}>
{`section,question,option1,option2,option3,option4,correct_answers,marks,explanation
Mathematics,What is 5 × 7?,25,30,35,40,35,1,Basic multiplication
Science,Select all mammals,Dolphin,Eagle,Shark,Bat,Dolphin;Bat,2,Mammals nurse their young
Cricket,Who is known as the "God of Cricket"?,Virat Kohli,Sachin Tendulkar,MS Dhoni,Ricky Ponting,Sachin Tendulkar,1,Sachin is often called the 'God of Cricket'`}
              </Box>
            </Box>
          </Box>
          {/* Download CSV Template Section */}
          <Box mb={4}>
            <Typography variant="body2" mb={1}>
              Download a ready-to-use CSV template for bulk question import.<br/>
              <b>Note:</b> For multiple correct answers, use a semicolon (;) to separate them, and do not use quotes. Example: <code>Helium;Argon</code>
            </Typography>
            <Button variant="outlined" color="primary" href="/assets/quiz-template.csv" download>
              Download CSV Template
            </Button>
          </Box>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
              <Stack spacing={4}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Create Quiz</Typography>

                {/* Quiz Information Section */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Quiz Information</Typography>
                  <Stack spacing={2}>
                    <Controller
                      name="quizTitle"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          label="Quiz Title"
                          {...field}
                          fullWidth
                          helperText="Enter a descriptive title for your quiz."
                          error={!!errors.quizTitle}
                        />
                      )}
                    />
                    {errors.quizTitle && <Typography color="error" variant="caption">{errors.quizTitle.message}</Typography>}
                    <TextField label="Description" {...register("description")}
                      fullWidth multiline minRows={2}
                      helperText="Describe the quiz for students (optional)."
                      error={!!errors.description} />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField label="Total Marks" type="number" {...register("totalMarks")}
                        fullWidth helperText="Sum of all question marks. This will be automatically calculated and added."
                        error={!!errors.totalMarks} />
                      <TextField label="Duration (mins)" type="number" {...register("duration")}
                        fullWidth helperText="How long students have to complete the quiz."
                        error={!!errors.duration} />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <ModernDateTimePicker label="Start Date & Time"
                        value={watch("startDateTime") instanceof Date ? watch("startDateTime") : new Date()}
                        onChange={date => setValue("startDateTime", date ?? new Date())} />
                      <ModernDateTimePicker label="End Date & Time"
                        value={watch("expiryDateTime") instanceof Date ? watch("expiryDateTime") : new Date()}
                        onChange={date => setValue("expiryDateTime", date ?? new Date())} />
                    </Stack>
                    <TextField label="Max Attempts" type="number" {...register("maxAttempts")}
                      fullWidth helperText="How many times a student can attempt this quiz."
                      error={!!errors.maxAttempts} />
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel control={<Checkbox {...register("previewMode")} />} label="Enable Preview Mode" />
                      <FormControlLabel control={<Checkbox {...register("shuffleQuestions")} />} label="Shuffle Questions" />
                      <FormControlLabel control={<Checkbox {...register("shuffleOptions")} />} label="Shuffle Options" />
                    </Stack>
                  </Stack>
                </Paper>

                {/* Question Navigation Bar */}
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', bgcolor: 'background.paper', boxShadow: 1 }}>
                  {questionFields.map((q, i) => {
                    const qVal = watch(`questions.${i}`);
                    const isComplete = qVal && qVal.question && qVal.options && qVal.options.length >= 2 && qVal.options.every((opt: any) => opt.text);
                    
                    return (
                      <Chip
                        key={q.id}
                        label={`Q${i + 1}`}
                        variant={expandedIndex === i ? 'filled' : 'outlined'}
                        color={isComplete ? 'primary' : 'default'}
                        clickable
                        onClick={() => {
                          setExpandedIndex(i);
                          const el = document.getElementById(`question-accordion-${i}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        sx={{ 
                          fontWeight: 500, 
                          fontSize: '0.98rem', 
                          mx: 0.5, 
                          my: 0.5, 
                          bgcolor: expandedIndex === i ? 'primary.main' : 'background.paper',
                          color: expandedIndex === i ? 'primary.contrastText' : 'text.primary',
                          borderColor: 'grey.400',
                          boxShadow: 0 
                        }}
                      />
                    );
                  })}
                </Paper>

                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>Questions</Typography>
                <Stack spacing={2}>
                  {questionFields.map((q, i) => {
                    const opts = watch(`questions.${i}.options`);
                    return <QuestionAccordion key={q.id} q={q} i={i} opts={opts} />;
                  })}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() =>
                      append({
                        section: sections[0],
                        question: '',
                        questionType: 'single',
                        image: null,
                        explanation: '',
                        marks: '1',
                        options: [
                          { text: '', image: null, isCorrect: false },
                          { text: '', image: null, isCorrect: false },
                        ],
                      })
                    }
                    sx={{ mt: 2, fontWeight: 700, borderRadius: 2, boxShadow: 2, px: 4 }}
                    startIcon={<AddIcon />}
                  >
                    Add Question
                  </Button>
                </Stack>
                <Box sx={{ position: 'sticky', bottom: 0, zIndex: 10, bgcolor: 'background.paper', py: 2, mt: 4, boxShadow: 3, borderRadius: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="contained" size="large" sx={{ px: 5, fontWeight: 700 }} disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Create Quiz'}
                  </Button>
                </Box>
              </Stack>
            </form>
          </FormProvider>
        </Paper>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Quiz Created Successfully!</DialogTitle>
          <DialogContent>
            <Typography>Share this access code with your students:</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h4" sx={{ mt: 2, mb: 1 }} color="primary" fontWeight="bold">
                {accessCode}
              </Typography>
              <Tooltip title={toast.open && toast.msg === 'Access code copied!' ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton
                  aria-label="Copy access code"
                  onClick={() => {
                    if (accessCode) {
                      navigator.clipboard.writeText(accessCode);
                      setToast({ open: true, msg: 'Access code copied!', type: 'success' });
                    }
                  }}
                  sx={{ mt: 1 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="7" y="7" width="10" height="10" rx="2" stroke="#1976d2" strokeWidth="2"/>
                    <rect x="3" y="3" width="10" height="10" rx="2" stroke="#90caf9" strokeWidth="2"/>
                  </svg>
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2">
              You can manage this quiz from your dashboard.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => router.push('/dashboard')} variant="outlined" color="primary">
              ← Back to Dashboard
            </Button>
            {accessCode && (
              <Button onClick={() => router.push(`/edit-quiz/${accessCode}`)} variant="contained" color="primary">
                Edit This Quiz
              </Button>
            )}
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={toast.type}
            onClose={() => setToast({ ...toast, open: false })}
            sx={{ width: '100%' }}
          >
            {toast.msg}
          </Alert>
        </Snackbar>
        {uploadError && <Snackbar open={!!uploadError} autoHideDuration={4000} onClose={() => setUploadError(null)}>
          <Alert severity="error" onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        </Snackbar>}

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, index: null })}>
          <DialogTitle>Delete Question?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this question? This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, index: null })}>Cancel</Button>
            <Button color="error" onClick={() => {
              if (deleteDialog.index !== null) remove(deleteDialog.index);
              setDeleteDialog({ open: false, index: null });
            }}>Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Add Dialog for inline section creation */}
        <Dialog open={addSectionDialog.open} onClose={() => setAddSectionDialog({ open: false, qIndex: null })}>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Section Name"
              fullWidth
              value={inlineNewSection}
              onChange={e => setInlineNewSection(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (inlineNewSection.trim() && !sections.includes(inlineNewSection.trim())) {
                    setSections([...sections, inlineNewSection.trim()]);
                    if (addSectionDialog.qIndex !== null) setValue(`questions.${addSectionDialog.qIndex}.section`, inlineNewSection.trim());
                    setInlineNewSection("");
                    setAddSectionDialog({ open: false, qIndex: null });
                  }
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddSectionDialog({ open: false, qIndex: null })}>Cancel</Button>
            <Button onClick={() => {
              if (inlineNewSection.trim() && !sections.includes(inlineNewSection.trim())) {
                setSections([...sections, inlineNewSection.trim()]);
                if (addSectionDialog.qIndex !== null) setValue(`questions.${addSectionDialog.qIndex}.section`, inlineNewSection.trim());
                setInlineNewSection("");
                setAddSectionDialog({ open: false, qIndex: null });
              }
            }} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}