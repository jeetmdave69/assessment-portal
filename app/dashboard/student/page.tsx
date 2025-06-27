'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
  TextField,
  Pagination,
  Tabs,
  Tab,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import AppWelcome from '@/sections/overview/app-welcome';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BookIcon from '@mui/icons-material/Book';
import BarChartIcon from '@mui/icons-material/BarChart';
import MessageIcon from '@mui/icons-material/Message';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import LogoutIcon from '@mui/icons-material/Logout';

const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

const COMPLETED_PAGE_SIZE = 6;

const instructions = [
  "You are only allowed to start the test at the prescribed time. The timer will start from the current time irrespective of when you start the exam and end when the given time is up.",
  "You can see the history of test taken and scores in the Results section",
  "To start the test, click on 'Start' button in the exam section.",
  "Once the test is started the timer would run irrespective of your logged in or logged out status. So it is recommended not to logout before test completion.",
  "To mark an answer you need to select the option. Upon locking the selected options button will \"blue\".",
  "To reset the form click on the reset button at the bottom.",
  "The assigned tests should be completed within the submission time. Failing to complete the assessment will award you zero marks.",
  "The marks will be calculated and displayed instantly in the result section along with your percentage."
];

const boxStyles = [
  { bg: '#fff', color: '#002366', border: '1px solid #e3e6ef' },
  { bg: '#fff', color: '#1565c0', border: '1px solid #e3e6ef' },
  { bg: '#fff', color: '#37474f', border: '1px solid #e3e6ef' },
];

export default function StudentDashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [selectedSection, setSelectedSection] = useState('dashboard');
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [userAttempts, setUserAttempts] = useState<Record<number, number>>({});
  const [availableTests, setAvailableTests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [completedPage, setCompletedPage] = useState(1);
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [examsCount, setExamsCount] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);

  const now = new Date();
  const classify = (q: any): 'live' | 'upcoming' | 'completed' | 'expired' => {
    const start = new Date(q.start_time);
    const end = new Date(q.end_time);
    const done = (userAttempts[q.id] || 0) >= (q.max_attempts || 1);
    if (done) return 'completed';
    if (now > end) return 'expired';
    if (now < start) return 'upcoming';
    return 'live';
  };
  const liveQuizzes = allQuizzes.filter((q) => classify(q) === 'live');
  const upcomingQuizzes = allQuizzes.filter((q) => classify(q) === 'upcoming');
  const completedQuizzes = allQuizzes.filter((q) => ['completed', 'expired'].includes(classify(q)));
  const currentCompleted = completedQuizzes.slice(
    (completedPage - 1) * COMPLETED_PAGE_SIZE,
    completedPage * COMPLETED_PAGE_SIZE
  );

  useEffect(() => {
    setMounted(true);
    fetchQuizzes();
  }, [user]);

  useEffect(() => {
    const now = new Date();
    const avail = allQuizzes.filter((q) => {
      const end = new Date(q.end_time);
      return now < end && (userAttempts[q.id] || 0) < (q.max_attempts || 1);
    });
    setAvailableTests(avail.length);
  }, [allQuizzes, userAttempts]);

  useEffect(() => {
    if (typeof window === 'undefined' || !liveQuizzes.length) return;
    liveQuizzes.forEach((q) => {
      if (router.prefetch) router.prefetch(`/attempt-quiz/${q.id}`);
    });
  }, [liveQuizzes, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from('quizzes').select('id', { count: 'exact', head: true }).then(({ count }) => setExamsCount(count || 0));
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count }) => setAttemptsCount(count || 0));
    supabase.from('message').select('id', { count: 'exact', head: true }).then(({ count }) => setAnnouncementsCount(count || 0));
  }, [user]);

  const fetchQuizzes = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('quizzes').select('*').eq('is_draft', false);
    setAllQuizzes(data ?? []);
    if (data?.length) fetchAttempts(data.map((q) => q.id));
    setLoading(false);
  };

  const fetchAttempts = async (ids: number[]) => {
    const { data } = await supabase.from('attempts').select('quiz_id').eq('user_id', user!.id);
    const counts: Record<number, number> = {};
    ids.forEach((id) => (counts[id] = data?.filter((a) => a.quiz_id === id).length ?? 0));
    setUserAttempts(counts);
  };

  const handleAccessCodeSubmit = async () => {
    setCodeError('');
    if (!accessCode.trim()) {
      setCodeError('Enter a code.');
      return;
    }
    setCodeLoading(true);
    try {
      const { data } = await supabase.from('quizzes').select('*').eq('access_code', accessCode).single();
      if (!data) {
        setCodeError('Invalid code.');
        return;
      }
      const now = new Date();
      if (now < new Date(data.start_time)) setCodeError('Quiz not started.');
      else if (now > new Date(data.end_time)) setCodeError('Quiz ended.');
      else router.push(`/attempt-quiz/${data.id}`);
    } finally {
      setCodeLoading(false);
    }
  };

  if (!mounted || !user) return null;

  const sidebarLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, onClick: () => setSelectedSection('dashboard'), active: selectedSection === 'dashboard' },
    { text: 'Exams', icon: <BookIcon />, onClick: () => setSelectedSection('exams'), active: selectedSection === 'exams' },
    { text: 'Results', icon: <BarChartIcon />, onClick: () => router.push('/dashboard/student?tab=results') },
    { text: 'Messages', icon: <MessageIcon />, onClick: () => router.push('/dashboard/student?tab=messages') },
    { text: 'Settings', icon: <SettingsIcon />, onClick: () => router.push('/dashboard/student?tab=settings') },
    { text: 'Help', icon: <HelpIcon />, onClick: () => router.push('/dashboard/student?tab=help') },
    { text: 'Log out', icon: <LogoutIcon />, onClick: () => signOut(), logout: true },
  ];

  return (
    <Box display="flex" sx={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 240,
            boxSizing: 'border-box',
            background: '#002366',
            color: '#fff',
            border: 'none',
            minHeight: '100vh',
            boxShadow: '2px 0 8px 0 rgba(0,0,0,0.04)',
            transition: 'all 0.5s',
          },
        }}
      >
        <Box display="flex" alignItems="center" p={2} mb={1}>
          <DashboardIcon sx={{ mr: 1, color: '#fff', fontSize: 32 }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: 22, letterSpacing: 1 }}>Welcome</Typography>
        </Box>
        <List sx={{ mt: 2 }}>
          {sidebarLinks.map((link, idx) => (
            <ListItem
              button
              key={link.text}
              onClick={link.onClick}
              sx={{
                color: link.logout ? '#ff5252' : '#fff',
                background: link.active ? '#001b4e' : 'none',
                borderRadius: '30px 0 0 30px',
                mb: 1,
                fontWeight: link.active ? 600 : 400,
                pl: 2,
                pr: 1,
                '&:hover': { background: '#001b4e' },
                transition: 'all 0.4s',
              }}
            >
              <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>{link.icon}</ListItemIcon>
              <ListItemText primary={link.text} sx={{ '.MuiTypography-root': { fontSize: 16, fontWeight: 500 } }} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 3 }, minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Poppins, sans-serif' }}>
        {/* Top Bar */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
          p={2}
          borderRadius={2}
          sx={{
            background: '#fff',
            color: '#002366',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: 'none',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          <Typography variant="h5" fontWeight={700} letterSpacing={0.5} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>Student Dashboard</Typography>
          <Box display="flex" alignItems="center">
            <Avatar src={user.imageUrl} alt="pro" sx={{ mr: 2, border: '2px solid #e3e6ef', width: 44, height: 44 }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>{user.firstName}</Typography>
          </Box>
        </Box>

        {/* Main Content Section Switcher */}
        {selectedSection === 'dashboard' && (
          <>
            {/* Overview Boxes */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={4}>
                <Box p={3} borderRadius={3} boxShadow={2} sx={{ ...boxStyles[0], minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#002366', fontSize: 18 }}>Exams</Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color: '#002366', fontSize: 36 }}>{examsCount}</Typography>
                  <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 15 }}>Total number of exams</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box p={3} borderRadius={3} boxShadow={2} sx={{ ...boxStyles[1], minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#1565c0', fontSize: 18 }}>Attempts</Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color: '#1565c0', fontSize: 36 }}>{attemptsCount}</Typography>
                  <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 15 }}>Total number of attempted exams</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box p={3} borderRadius={3} boxShadow={2} sx={{ ...boxStyles[2], minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#37474f', fontSize: 18 }}>Announcements</Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color: '#37474f', fontSize: 36 }}>{announcementsCount}</Typography>
                  <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 15 }}>Total number of messages received</Typography>
                </Box>
              </Grid>
            </Grid>

            {/* General Instructions */}
            <Box p={{ xs: 2, sm: 3 }} borderRadius={3} boxShadow={1} sx={{ background: '#fff', maxWidth: 900, mx: 'auto', border: 'none', fontFamily: 'Poppins, sans-serif' }}>
              <Typography variant="h6" align="center" gutterBottom sx={{ color: '#002366', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
                :: General Instructions ::
              </Typography>
              <ul style={{ paddingLeft: 24 }}>
                {instructions.map((ins, idx) => (
                  <li key={idx} style={{ marginBottom: 14, color: '#333', fontSize: 16, lineHeight: 1.7, fontFamily: 'Poppins, sans-serif' }}>{ins}</li>
                ))}
              </ul>
            </Box>
          </>
        )}

        {selectedSection === 'exams' && (
          <>
            {/* Exam Section (Quizzes List) */}
            {loading ? (
              <Box py={6} display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box mb={6}>
                  {liveQuizzes.length > 0 && (
                    <>
                      <Typography variant="h6" mb={2} sx={{ color: '#002366', fontWeight: 700 }}>Live</Typography>
                      <Grid container spacing={3}>
                        {liveQuizzes.map((q) => (
                          <QuizCard
                            key={q.id}
                            quiz={q}
                            status="live"
                            attempts={userAttempts[q.id] || 0}
                            onStart={() => router.push(`/attempt-quiz/${q.id}`)}
                          />
                        ))}
                      </Grid>
                    </>
                  )}

                  {upcomingQuizzes.length > 0 && (
                    <>
                      <Typography variant="h6" mb={2} sx={{ color: '#002366', fontWeight: 700 }}>Upcoming</Typography>
                      <Grid container spacing={3}>
                        {upcomingQuizzes.map((q) => (
                          <QuizCard
                            key={q.id}
                            quiz={q}
                            status="upcoming"
                            attempts={0}
                            onStart={() => {}}
                          />
                        ))}
                      </Grid>
                    </>
                  )}

                  {completedQuizzes.length > 0 && (
                    <>
                      <Typography variant="h6" mb={2} sx={{ color: '#002366', fontWeight: 700 }}>Completed / Expired</Typography>
                      <Grid container spacing={3}>
                        {currentCompleted.map((q) => (
                          <QuizCard
                            key={q.id}
                            quiz={q}
                            status={classify(q)}
                            attempts={userAttempts[q.id] || 0}
                            onStart={() => {}}
                          />
                        ))}
                      </Grid>
                      {completedQuizzes.length > COMPLETED_PAGE_SIZE && (
                        <Box mt={3} display="flex" justifyContent="center">
                          <Pagination
                            shape="rounded"
                            color="primary"
                            count={Math.ceil(completedQuizzes.length / COMPLETED_PAGE_SIZE)}
                            page={completedPage}
                            onChange={(_, p) => setCompletedPage(p)}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Box>

                {/* Access Quiz by Code */}
                <Box mb={6} p={4} borderRadius={3} bgcolor="#fff" boxShadow={1} border="none" sx={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#002366', fontWeight: 700 }}>Access Quiz by Code</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Access Code"
                      fullWidth
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      error={!!codeError}
                      helperText={codeError}
                      sx={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                    <Button variant="contained" disabled={codeLoading} onClick={handleAccessCodeSubmit} sx={{ minWidth: 160, background: '#002366', color: '#fff', borderRadius: 2, fontWeight: 600, fontFamily: 'Poppins, sans-serif', '&:hover': { background: '#001b4e' } }}>
                      {codeLoading ? 'Checking…' : 'Begin'}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

function QuizCard({
  quiz,
  status,
  attempts,
  onStart,
}: {
  quiz: any;
  status: 'live' | 'upcoming' | 'completed' | 'expired';
  attempts: number;
  onStart: () => void;
}) {
  const start = new Date(quiz.start_time);
  const end = new Date(quiz.end_time);

  const map = {
    live: { badge: 'LIVE', bg: 'info.light', text: 'info.darker', btn: 'primary', disabled: false },
    upcoming: { badge: 'UPCOMING', bg: 'warning.light', text: 'warning.darker', btn: 'secondary', disabled: true },
    completed: { badge: 'COMPLETED', bg: 'success.light', text: 'success.darker', btn: 'secondary', disabled: true },
    expired: { badge: 'EXPIRED', bg: 'error.light', text: 'error.darker', btn: 'secondary', disabled: true },
  }[status];

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Box
        p={3}
        borderRadius={3}
        border="none"
        bgcolor="#fff"
        boxShadow={2}
        minHeight={310}
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        sx={{ '&:hover': { transform: status === 'live' ? 'translateY(-4px)' : undefined }, transition: '.2s', fontFamily: 'Poppins, sans-serif' }}
      >
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>{quiz.quiz_title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box px={1.5} py={0.4} borderRadius={2} fontSize={12} fontWeight={600} textTransform="uppercase" bgcolor={map.bg} color={map.text} sx={{ fontFamily: 'Poppins, sans-serif' }}>
              {map.badge}
            </Box>
            <Typography variant="caption" color="text.secondary">Starts: {formatDateTime(start)}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" ml={6}>Ends: {formatDateTime(end)}</Typography>
          <Typography variant="body2" color="text.secondary">Duration: <strong>{quiz.duration_minutes} min</strong></Typography>
          <Typography variant="body2" color="text.secondary">Attempts: <strong>{attempts}</strong> / {quiz.max_attempts}</Typography>
          <Typography variant="body2" color="text.secondary">Pass: <strong>{quiz.pass_marks}</strong> / {quiz.total_marks}</Typography>
        </Stack>
        <Button
          variant="contained"
          color={map.btn as any}
          disabled={map.disabled}
          onClick={onStart}
          sx={{ mt: 3, textTransform: 'none', fontWeight: 600, borderRadius: 2, background: '#002366', color: '#fff', fontFamily: 'Poppins, sans-serif', '&:hover': { background: '#001b4e' } }}
        >
          {status === 'live' ? 'Start Quiz' : map.badge}
        </Button>
      </Box>
    </Grid>
  );
}