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
import { useForm, FormProvider, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { quizSchema, QuizFormValues, QuizSectionEnum, getSectionName, QuizSection } from '@/schemas/quizSchema';
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
  section_id: number;
}

interface QuizResponse {
  id: string;
  access_code: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Enhanced section labels with descriptions
const SECTION_LABELS = {
  qa: {
    title: 'Quantitative Aptitude (QA)',
    description: 'Mathematics, algebra, geometry, arithmetic problems'
  },
  lr: {
    title: 'Logical Reasoning (LR)',
    description: 'Puzzles, sequences, pattern recognition, logical problems'
  },
  va: {
    title: 'Verbal Ability (VA)',
    description: 'Grammar, vocabulary, sentence correction, word meanings'
  },
  di: {
    title: 'Data Interpretation (DI)',
    description: 'Charts, graphs, tables analysis and data-based questions'
  },
  gk: {
    title: 'General Knowledge (GK)',
    description: 'Current affairs, static GK, and general awareness'
  }
};

const SECTION_CODE_TO_ID = { qa: 1, lr: 2, va: 3, di: 4, gk: 5 };
const SECTION_ID_TO_CODE = { 1: 'qa', 2: 'lr', 3: 'va', 4: 'di', 5: 'gk' };

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
  const [sectionsEnabled, setSectionsEnabled] = useState(['qa', 'lr', 'va', 'di', 'gk']);

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
          section_id: SECTION_CODE_TO_ID['qa'],
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
            const correctAnswers = (row.correct_answers || '').split(';').map((s: string) => s.trim());
            const questionType = correctAnswers.length > 1 ? 'multiple' : 'single';

            const options = [1, 2, 3, 4]
              .map((i) => ({
                text: row[`option${i}`] || '',
                image: null,
                isCorrect: correctAnswers.includes((row[`option${i}`] || '').trim()),
              }))
              .filter(opt => opt.text);

            return {
              section_id: SECTION_CODE_TO_ID[row.section as keyof typeof SECTION_CODE_TO_ID] || SECTION_CODE_TO_ID['qa'],
              question: row.question || '',
              questionType,
              explanation: row.explanation || '',
              marks: row.marks || '1',
              image: null,
              options: options.length >= 2 ? options : [
                { text: '', image: null, isCorrect: false },
                { text: '', image: null, isCorrect: false },
              ]
            };
          });

          setValue('questions', parsedQuestions);
          showToast('CSV imported successfully!', 'success');
        } catch {
          showToast('Invalid CSV format', 'error');
        }
      },
      error: () => showToast('Failed to read CSV', 'error'),
    });
  };

  const onSubmit = async (data: QuizFormValues, isDraft: boolean) => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      showToast('Please sign in', 'error');
      return;
    }

    setIsSubmitting(true);
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
          sections_enabled: data.sectionsEnabled,
        })
        .select('id, access_code')
        .single();

      if (quizError) {
        console.error('Quiz insert error:', quizError, JSON.stringify(quizError));
        showToast(quizError.message || JSON.stringify(quizError), 'error');
        setIsSubmitting(false);
        return;
      }
      if (!quiz) {
        console.error('Quiz insert returned no data');
        showToast('Quiz insert returned no data', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Process all questions
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

        // Insert question with all data
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
            section_id: q.section_id,
            blank_answers: null,
            matching_pairs: null
          });

        if (questionError) {
          console.error('Question insert error:', questionError, JSON.stringify(questionError));
          showToast(questionError.message || JSON.stringify(questionError), 'error');
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
      console.error('Quiz submission error:', err, JSON.stringify(err));
      showToast(err?.message || JSON.stringify(err) || 'Error saving quiz', 'error');
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

  const handleSectionToggle = (section: QuizSection) => {
    if (sectionsEnabled.includes(section)) {
      setSectionsEnabled(sectionsEnabled.filter((s) => s !== section));
    } else {
      setSectionsEnabled([...sectionsEnabled, section]);
    }
  };

  const QuestionAccordion = React.memo(function QuestionAccordion({ q, i, opts }: { q: any, i: number, opts: any[] }) {
    return (
      <Slide key={q.id} direction="up" in mountOnEnter unmountOnExit>
        <Accordion
          expanded={expandedIndex === i}
          onChange={() => setExpandedIndex(expandedIndex === i ? -1 : i)}
          sx={{ borderRadius: 3, boxShadow: 2, mb: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
          id={`question-accordion-${i}`}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Chip label={`Question ${i + 1}`} variant="outlined" size="medium" sx={{ fontWeight: 600, fontSize: '1.05rem', bgcolor: 'background.paper', color: 'text.primary', borderColor: 'grey.400' }} />
                <Typography fontWeight={600} sx={{ color: 'text.primary' }}>{watch(`questions.${i}.question`) || `Question ${i + 1}`}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Chip 
                  label={SECTION_LABELS[watch(`questions.${i}.section_id`) as QuizSection].title} 
                  variant="outlined" 
                  size="small" 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    color: 'text.secondary', 
                    borderColor: 'grey.300',
                    fontWeight: 500 
                  }} 
                />
                <Chip label={watch(`questions.${i}.questionType`) === 'multiple' ? 'Multiple' : 'Single'} variant="outlined" size="small" sx={{ bgcolor: 'background.paper', color: 'text.secondary', borderColor: 'grey.300' }} />
                <Chip label={`Marks: ${watch(`questions.${i}.marks`)}`} variant="outlined" size="small" sx={{ bgcolor: 'background.paper', color: 'text.secondary', borderColor: 'grey.300' }} />
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
            <Stack spacing={2}>
              <TextField label="Question" {...register(`questions.${i}.question`)} fullWidth required error={!!errors.questions?.[i]?.question} helperText={errors.questions?.[i]?.question?.message} />
              
              {/* Question image upload */}
              <Box display="flex" alignItems="center" gap={2}>
                {watch(`questions.${i}.image`) && typeof watch(`questions.${i}.image`) === 'string' && (
                  <img src={watch(`questions.${i}.image`)} alt="Question" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
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
                {watch(`questions.${i}.image`) && typeof watch(`questions.${i}.image`) === 'string' && (
                  <IconButton color="error" onClick={() => setValue(`questions.${i}.image`, null)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Select label="Type" value={watch(`questions.${i}.questionType`) as 'single' | 'multiple'} onChange={e => setValue(`questions.${i}.questionType`, e.target.value as 'single' | 'multiple')} fullWidth>
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
                  value={watch(`questions.${i}.section_id`) || SECTION_CODE_TO_ID['qa']}
                  label="Question Section *"
                  onChange={(e) => setValue(`questions.${i}.section_id`, parseInt(e.target.value))}
                  required
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center'
                    }
                  }}
                >
                  {QuizSectionEnum.options.map((section) => (
                    <MenuItem 
                      key={section} 
                      value={SECTION_CODE_TO_ID[section]}
                      disabled={sectionsEnabled && !sectionsEnabled.includes(section)}
                      sx={{
                        py: 2,
                        borderLeft: '4px solid',
                        borderColor: SECTION_CODE_TO_ID[section] === SECTION_CODE_TO_ID['qa'] ? 'primary.main' : 
                                    SECTION_CODE_TO_ID[section] === SECTION_CODE_TO_ID['lr'] ? 'secondary.main' :
                                    SECTION_CODE_TO_ID[section] === SECTION_CODE_TO_ID['va'] ? 'success.main' :
                                    SECTION_CODE_TO_ID[section] === SECTION_CODE_TO_ID['di'] ? 'info.main' :
                                    SECTION_CODE_TO_ID[section] === SECTION_CODE_TO_ID['gk'] ? 'warning.main' : 'error.main'
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{SECTION_LABELS[section].title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {SECTION_LABELS[section].description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
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
                    {watch(`questions.${i}.questionType`) === 'single' ? (
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
              ← Dashboard
            </Button>
          </Stack>
        </Paper>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight={600} color="primary">
              Create New Quiz
            </Typography>
            <Tooltip title="Toggle theme">
              <IconButton onClick={toggleMode}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Button onClick={() => router.push('/dashboard')} sx={{ mb: 3 }}>
            ← Back to Dashboard
          </Button>

          <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Import Questions
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="contained"
                component="label"
                startIcon={<ImageIcon />}
                sx={{ textTransform: 'none' }}
              >
                Upload CSV
                <input type="file" hidden accept=".csv" onChange={handleCsvUpload} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                Format: question,option1,option2,option3,option4,correct_answers,explanation,marks,section
              </Typography>
            </Stack>
          </Box>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
              <Stack spacing={4}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Create Quiz</Typography>

                {/* Quiz Information Section */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Quiz Information</Typography>
                  <Stack spacing={2}>
                    <TextField label="Quiz Title" {...register("quizTitle")}
                      fullWidth helperText="Enter a descriptive title for your quiz."
                      error={!!errors.quizTitle} />
                    {errors.quizTitle && <Typography color="error" variant="caption">{errors.quizTitle.message}</Typography>}
                    <TextField label="Description" {...register("description")}
                      fullWidth multiline minRows={2}
                      helperText="Describe the quiz for students (optional)."
                      error={!!errors.description} />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField label="Total Marks" type="number" {...register("totalMarks")}
                        fullWidth helperText="Sum of all question marks."
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

                {/* Section Enable/Disable Checkboxes */}
                <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Select Sections to Enable
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enable the sections you want to include in this quiz. You can assign questions to these sections.
                  </Typography>
                  <FormGroup row sx={{ gap: 2 }}>
                    {QuizSectionEnum.options.map((section) => (
                      <Paper 
                        key={section}
                        elevation={sectionsEnabled?.includes(section) ? 3 : 1}
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          border: '1px solid', 
                          borderColor: sectionsEnabled?.includes(section) ? 'primary.main' : 'divider',
                          minWidth: 200,
                          flexGrow: 1
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Array.isArray(sectionsEnabled) && sectionsEnabled.includes(section)}
                              onChange={() => handleSectionToggle(section)}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography fontWeight={600}>{SECTION_LABELS[section].title}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {SECTION_LABELS[section].description}
                              </Typography>
                            </Box>
                          }
                          sx={{ width: '100%' }}
                        />
                      </Paper>
                    ))}
                  </FormGroup>
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
                        section_id: SECTION_CODE_TO_ID['qa'],
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
            <Typography variant="h4" sx={{ mt: 2, mb: 1 }} color="primary" fontWeight="bold">
              {accessCode}
            </Typography>
            <Typography variant="body2">
              You can manage this quiz from your dashboard.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
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
      </Container>
    </LocalizationProvider>
  );
}