'use client';

import { useEffect, useState, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import AppWelcome from '@/sections/overview/app-welcome';
import AppWidgetSummary from '@/sections/overview/app-widget-summary';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  Dashboard as DashboardIcon,
  Book as BookIcon,
  BarChart as BarChartIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  WbSunny as WbSunnyIcon,
  WbTwilight as WbTwilightIcon,
  NightsStay as NightsStayIcon,
  PlayArrow as PlayArrowIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import SummaryCards from '../../../components/dashboard/SummaryCards';

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

  // Settings/Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    dob: '',
    gender: '',
    profile_picture: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Messages/Announcements state
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Results state
  const [results, setResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const [quizProgress, setQuizProgress] = useState<Record<number, boolean>>({});

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

  // Greeting logic
  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) {
      return { greet: 'Good Morning', icon: <WbSunnyIcon sx={{ fontSize: 60, color: '#fbc02d', background: '#fffde7', borderRadius: 2, p: 1 }} /> };
    } else if (hour >= 12 && hour < 17) {
      return { greet: 'Good Afternoon', icon: <WbTwilightIcon sx={{ fontSize: 60, color: '#ff9800', background: '#fff3e0', borderRadius: 2, p: 1 }} /> };
    } else {
      return { greet: 'Good Evening', icon: <NightsStayIcon sx={{ fontSize: 60, color: '#37474f', background: '#eceff1', borderRadius: 2, p: 1 }} /> };
    }
  };
  const { greet, icon } = getGreeting();

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
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count }) => setAttemptsCount(count || 0));
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_active', true).then(({ count }) => setAnnouncementsCount(count || 0));
  }, [user]);

  // Set examsCount to number of live quizzes
  useEffect(() => {
    setExamsCount(liveQuizzes.length);
  }, [liveQuizzes]);

  // Fetch profile from Supabase on mount or user change
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('student')
        .select('full_name, email, dob, gender, profile_picture')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfileForm({
          full_name: data.full_name || '',
          email: data.email || '',
          dob: data.dob || '',
          gender: data.gender || '',
          profile_picture: data.profile_picture || '',
        });
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (selectedSection !== 'messages') return;
    setMessagesLoading(true);
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .in('target_audience', ['all', 'students'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMessages(data || []);
        setMessagesLoading(false);
      });
  }, [selectedSection]);

  useEffect(() => {
    if (selectedSection !== 'results' || !user) return;
    setResultsLoading(true);
    console.log('Fetching results for user:', user.id);
    
    // First, let's try a simple query to see if we can get any attempts
    supabase
      .from('attempts')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        console.log('Simple attempts query:', { data, error });
        if (error) {
          console.error('Error details:', error);
        }
      });
    
    // Then try the full query with joins
    supabase
      .from('attempts')
      .select(`
        *,
        quizzes:quiz_id(
          quiz_title, 
          total_marks,
          duration
        )
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .then(({ data, error }) => {
        console.log('Results query response:', { data, error });
        if (error) {
          console.error('Full query error details:', error);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          console.error('Error hint:', error.hint);
        }
        console.log('Raw results data:', data);
        if (data && data.length > 0) {
          console.log('First result item:', data[0]);
        }
        setResults(data || []);
        setResultsLoading(false);
      });
  }, [selectedSection, user]);

  useEffect(() => {
    if (!user) return;
    // Create student row if not exists
    const createStudentIfNotExists = async () => {
      const { id, fullName, emailAddresses } = user;
      const email = emailAddresses?.[0]?.emailAddress;
      if (!id || !email) return;
      const { data: existing } = await supabase
        .from('student')
        .select('id')
        .eq('id', id)
        .single();
      if (!existing) {
        await supabase.from('student').insert([
          {
            id,
            full_name: fullName || '',
            email,
            // dob, gender, profile_picture can be null/empty at first
          }
        ]);
      }
    };
    createStudentIfNotExists();
  }, [user]);

  // Fetch quiz progress for all live quizzes
  useEffect(() => {
    if (!user || !liveQuizzes.length) return;
    let isMounted = true;
    const fetchProgress = async () => {
      const progressMap: Record<number, boolean> = {};
      await Promise.all(liveQuizzes.map(async (q) => {
        try {
          const res = await fetch(`/api/quiz-progress?quiz_id=${q.id}&user_id=${user.id}`);
          const { data } = await res.json();
          // No need to parse, fields are already objects with jsonb columns
          progressMap[q.id] = !!data;
        } catch {
          progressMap[q.id] = false;
        }
      }));
      if (isMounted) setQuizProgress(progressMap);
    };
    fetchProgress();
    return () => { isMounted = false; };
  }, [user, liveQuizzes]);

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  // Handle profile picture upload
  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    if (!file) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}.${fileExt}`;
      console.log('Uploading to bucket: profile-pictures, filePath:', filePath, 'user:', user);
      const { error: uploadError, data: uploadData } = await supabase.storage.from('profile-pictures').upload(filePath, file, { upsert: true });
      if (uploadError) {
        console.error('Supabase upload error:', uploadError, JSON.stringify(uploadError, null, 2));
        setProfileError('Failed to upload image: ' + (uploadError.message || JSON.stringify(uploadError)));
        setProfileLoading(false);
        return;
      }
      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
      console.log('getPublicUrl data:', publicUrlData);
      const publicUrl = publicUrlData?.publicUrl;
      if (publicUrl) {
        setProfileForm((prev) => ({ ...prev, profile_picture: publicUrl }));
        // Update in DB immediately
        const { error: dbError } = await supabase.from('student').update({ profile_picture: publicUrl }).eq('id', user.id);
        if (dbError) {
          console.error('Supabase DB update error:', dbError);
          setProfileError('Failed to update profile picture in database: ' + dbError.message);
          setProfileLoading(false);
          return;
        }
        // Update Clerk profile image via backend API
        try {
          await fetch('/api/update-clerk-profile-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, imageUrl: publicUrl }),
          });
        } catch (clerkErr) {
          console.error('Failed to update Clerk profile image:', clerkErr);
        }
      }
      setProfileLoading(false);
    } catch (err: any) {
      console.error('Unexpected error during upload:', err, JSON.stringify(err, null, 2));
      setProfileError('Unexpected error: ' + (err.message || JSON.stringify(err)));
      setProfileLoading(false);
    }
  };

  // Handle delete profile picture
  const handleDeleteProfilePic = async () => {
    if (!user || !profileForm.profile_picture) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      // Extract file name from URL
      const urlParts = profileForm.profile_picture.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      // Remove from storage
      const { error: removeError } = await supabase.storage.from('profile-pictures').remove([fileName]);
      if (removeError) {
        setProfileError('Failed to delete image: ' + removeError.message);
        setProfileLoading(false);
        return;
      }
      // Set profile_picture to null in DB
      const { error: dbError } = await supabase.from('student').update({ profile_picture: null }).eq('id', user.id);
      if (dbError) {
        setProfileError('Failed to update database: ' + dbError.message);
        setProfileLoading(false);
        return;
      }
      setProfileForm((prev) => ({ ...prev, profile_picture: '' }));
      setProfileSuccess('Profile photo deleted.');
      // Remove Clerk profile image via backend API
      try {
        await fetch('/api/update-clerk-profile-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, imageUrl: null }),
        });
      } catch (clerkErr) {
        console.error('Failed to remove Clerk profile image:', clerkErr);
      }
    } catch (err: any) {
      setProfileError('Unexpected error: ' + (err.message || String(err)));
    }
    setProfileLoading(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');
    if (!user) return;
    const { full_name, email, dob, gender, profile_picture } = profileForm;
    const { error } = await supabase.from('student').update({
      full_name,
      email,
      dob,
      gender,
      profile_picture,
    }).eq('id', user.id);
    if (error) {
      setProfileError('Failed to update profile.');
    } else {
      setProfileSuccess('Profile updated successfully!');
    }
    setProfileLoading(false);
  };

  // Add this useEffect to auto-clear success messages
  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileSuccess]);

  if (!mounted || !user) return null;

  const sidebarLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, onClick: () => setSelectedSection('dashboard'), active: selectedSection === 'dashboard' },
    { text: 'Exams', icon: <BookIcon />, onClick: () => setSelectedSection('exams'), active: selectedSection === 'exams' },
    { text: 'Results', icon: <BarChartIcon />, onClick: () => setSelectedSection('results'), active: selectedSection === 'results' },
    { text: 'Messages', icon: <MessageIcon />, onClick: () => setSelectedSection('messages'), active: selectedSection === 'messages' },
    { text: 'Settings', icon: <SettingsIcon />, onClick: () => setSelectedSection('settings'), active: selectedSection === 'settings' },
    { text: 'Help', icon: <HelpIcon />, onClick: () => setSelectedSection('help'), active: selectedSection === 'help' },
    { text: 'Log out', icon: <LogoutIcon />, onClick: () => setLogoutDialogOpen(true), logout: true },
  ];

  const helpContent = (
    <Box p={{ xs: 2, sm: 3 }} borderRadius={3} boxShadow={1} sx={{ background: '#fff', maxWidth: 900, mx: 'auto', border: 'none', fontFamily: 'Poppins, sans-serif' }}>
      <Typography variant="h5" align="center" gutterBottom sx={{ color: '#002366', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
        About & Help
      </Typography>
      <Box mt={3}>
        <Typography variant="h6" sx={{ color: '#002366', fontWeight: 600, mb: 2 }}>How to use</Typography>
        <Box component="ol" sx={{ pl: 3 }}>
          <li><Typography variant="subtitle1" fontWeight={600}>How to logout?</Typography>
            <Typography variant="body2">Click on the logout button at the left bottom on the navigation bar.</Typography></li>
          <li><Typography variant="subtitle1" fontWeight={600}>How to edit my profile details?</Typography>
            <Typography variant="body2">Click on the settings option from the left navigation bar. After filling the required columns, click on update.</Typography></li>
          <li><Typography variant="subtitle1" fontWeight={600}>How to view the results?</Typography>
            <Typography variant="body2">Go to the results option from the left navigation bar to view the results.</Typography></li>
          <li><Typography variant="subtitle1" fontWeight={600}>How to attempt exams?</Typography>
            <Typography variant="body2">Navigate to the exams tab by clicking on the exams button from the left navigation bar. Tests can be attempted from here.</Typography></li>
          <li><Typography variant="subtitle1" fontWeight={600}>How to view announcements?</Typography>
            <Typography variant="body2">Click on the messages option from the left navigation bar.</Typography></li>
        </Box>
      </Box>
    </Box>
  )

  const settingsContent = (
    <Box p={{ xs: 2, sm: 3 }} borderRadius={3} boxShadow={1} sx={{ background: '#fff', maxWidth: 500, mx: 'auto', border: 'none', fontFamily: 'Poppins, sans-serif' }}>
      <Typography variant="h5" align="center" gutterBottom sx={{ color: '#002366', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
        My Profile
      </Typography>
      <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
        <Avatar src={profileForm.profile_picture || user.imageUrl} alt="pro" sx={{ width: 80, height: 80, border: '2px solid #e3e6ef', mb: 1 }} />
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()} disabled={profileLoading}>
            {profileLoading ? 'Uploading...' : 'Change Photo'}
          </Button>
          {profileForm.profile_picture && (
            <Button variant="outlined" size="small" color="error" onClick={handleDeleteProfilePic} disabled={profileLoading}>
              Delete Photo
            </Button>
          )}
        </Box>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleProfilePicChange}
        />
      </Box>
      <form onSubmit={handleProfileSubmit}>
        <TextField
          label="Full Name"
          name="full_name"
          value={profileForm.full_name}
          onChange={handleProfileChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Email"
          name="email"
          value={profileForm.email}
          onChange={handleProfileChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Date of Birth"
          name="dob"
          type="date"
          value={profileForm.dob}
          onChange={handleProfileChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          label="Gender (M or F)"
          name="gender"
          value={profileForm.gender}
          onChange={handleProfileChange}
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 1 }}
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2, fontWeight: 600, borderRadius: 2, background: '#002366', color: '#fff', '&:hover': { background: '#001b4e' } }}
          disabled={profileLoading}
        >
          {profileLoading ? 'Updating…' : 'Update'}
        </Button>
      </form>
      {/* Snackbar for success */}
      <Snackbar
        open={!!profileSuccess}
        autoHideDuration={3000}
        onClose={() => setProfileSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setProfileSuccess('')} severity="success" sx={{ width: '100%' }}>
          {profileSuccess}
        </Alert>
      </Snackbar>
      {/* Snackbar for error */}
      <Snackbar
        open={!!profileError}
        autoHideDuration={4000}
        onClose={() => setProfileError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setProfileError('')} severity="error" sx={{ width: '100%' }}>
          {profileError}
        </Alert>
      </Snackbar>
    </Box>
  );

  const messagesContent = (
    <Box p={{ xs: 2, sm: 3 }} borderRadius={3} boxShadow={1} sx={{ background: '#fff', maxWidth: 900, mx: 'auto', border: 'none', fontFamily: 'Poppins, sans-serif' }}>
      <Typography variant="h5" align="center" gutterBottom sx={{ color: '#002366', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
        Announcements
      </Typography>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', background: 'transparent', mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#002366', width: '15%' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366', width: '25%' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366', width: '40%' }}>Content</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366', width: '10%' }}>From</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366', width: '10%' }}>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messagesLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : messages.length > 0 ? (
              messages.map((row, idx) => {
                const priorityColor = row.priority === 3 ? '#d32f2f' : row.priority === 2 ? '#f57c00' : '#1976d2';
                const priorityText = row.priority === 3 ? 'URGENT' : row.priority === 2 ? 'IMPORTANT' : 'NORMAL';
                
                return (
                  <TableRow key={idx} sx={{ 
                    backgroundColor: row.priority === 3 ? '#ffebee' : row.priority === 2 ? '#fff3e0' : 'inherit',
                    '&:hover': { backgroundColor: row.priority === 3 ? '#ffcdd2' : row.priority === 2 ? '#ffe0b2' : '#f5f5f5' }
                  }}>
                    <TableCell>
                      <Chip 
                        label={priorityText} 
                        size="small" 
                        sx={{ 
                          backgroundColor: priorityColor, 
                          color: 'white', 
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#002366' }}>{row.title}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                        {row.content}
                      </Typography>
                      {row.tags && row.tags.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {row.tags.map((tag: string, tagIdx: number) => (
                            <Chip 
                              key={tagIdx} 
                              label={tag} 
                              size="small" 
                              variant="outlined" 
                              sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                            />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{row.sender_name}</TableCell>
                    <TableCell>{row.created_at ? new Date(row.created_at).toLocaleDateString() : ''}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">No announcements found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const resultsContent = (
    <Box p={{ xs: 2, sm: 3 }} borderRadius={3} boxShadow={1} sx={{ background: '#fff', maxWidth: 1200, mx: 'auto', border: 'none', fontFamily: 'Poppins, sans-serif' }}>
      <Typography variant="h5" align="center" gutterBottom sx={{ color: '#002366', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
        My Results
      </Typography>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', background: 'transparent', mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Exam Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Total Questions</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Correct Answers</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Marks Obtained</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Total Marks</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Percentage</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Time Taken</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#002366' }}>Completed On</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resultsLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : results.length > 0 ? (
              results.map((row, idx) => {
                console.log(`Processing result ${idx}:`, row);
                
                // Use the fields from your actual schema
                const studentName = row.user_name || user?.firstName || '-';
                const examName = row.quizzes?.quiz_title || '-';
                const totalQuestions = row.total_questions || 0;
                const correctAnswers = row.correct_count || (Array.isArray(row.correct_answers) ? row.correct_answers.length : (row.correct_answers ? Object.keys(row.correct_answers).length : 0));
                const marksObtained = row.score || 0;
                const totalMarks = row.total_marks || row.quizzes?.total_marks || totalQuestions;
                const percentage = row.percentage || (totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0);
                
                // Calculate time taken using the correct field names
                const startTime = row.start_time ? new Date(row.start_time) : null;
                const endTime = row.completed_at ? new Date(row.completed_at) : row.submitted_at ? new Date(row.submitted_at) : null;
                const timeTaken = startTime && endTime ? 
                  Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) : // minutes
                  row.quizzes?.duration || 0;
                
                console.log(`Result ${idx} processed:`, {
                  studentName,
                  examName,
                  correctAnswers,
                  marksObtained,
                  totalMarks,
                  percentage,
                  timeTaken
                });
                
                return (
                  <TableRow key={idx}>
                    <TableCell>{studentName}</TableCell>
                    <TableCell>{examName}</TableCell>
                    <TableCell>{totalQuestions}</TableCell>
                    <TableCell>{correctAnswers}</TableCell>
                    <TableCell>{marksObtained}</TableCell>
                    <TableCell>{totalMarks}</TableCell>
                    <TableCell>{percentage}%</TableCell>
                    <TableCell>{timeTaken} min</TableCell>
                    <TableCell>{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">No results found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

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
            <Avatar src={profileForm.profile_picture || user.imageUrl} alt="pro" sx={{ mr: 2, border: '2px solid #e3e6ef', width: 44, height: 44 }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>{user.firstName}</Typography>
          </Box>
        </Box>

        {/* Main Content Section Switcher */}
        {selectedSection === 'dashboard' && (
          <>
            {/* Greeting */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              {icon}
              <Typography variant="h5" fontWeight={700} color="#002366">
                {greet}, {user?.firstName || user?.fullName || 'Student'}!
              </Typography>
            </Box>
            {/* Overview Boxes */}
            <Grid container spacing={3} mb={4} alignItems="stretch">
              <Grid item xs={12} sm={4}>
                <SummaryCards
                  title="Exams"
                  total={examsCount}
                  color="#002366"
                  countColor="#002366"
                />
                <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 15, textAlign: 'center', mt: 1 }}>Active exams</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <SummaryCards
                  title="Upcoming Exams"
                  total={upcomingQuizzes.length}
                  color="#000"
                  countColor="#000"
                />
                <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 15, textAlign: 'center', mt: 1 }}>Exams scheduled for the future</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <SummaryCards
                  title="Announcements"
                  total={announcementsCount}
                  color="#000"
                  countColor="#000"
                />
                <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 15, textAlign: 'center', mt: 1 }}>Total number of messages received</Typography>
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
            {/* Access Quiz by Code - moved to top */}
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
                            hasProgress={quizProgress[q.id]}
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
              </>
            )}
          </>
        )}

        {/* Settings/Profile Section */}
        {selectedSection === 'settings' && settingsContent}

        {/* Help/About Section */}
        {selectedSection === 'help' && helpContent}

        {/* Messages/Announcements Section */}
        {selectedSection === 'messages' && messagesContent}

        {/* Results Section */}
        {selectedSection === 'results' && resultsContent}
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle sx={{ color: '#002366', fontWeight: 700 }}>
          Log Out
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to log out?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You will need to sign in again to access your dashboard.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setLogoutDialogOpen(false);
              signOut({ redirectUrl: "/sign-in" });
            }}
            color="error"
            variant="contained"
          >
            Yes, Log me out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function QuizCard({
  quiz,
  status,
  attempts,
  hasProgress = false,
  onStart,
}: {
  quiz: any;
  status: 'live' | 'upcoming' | 'completed' | 'expired';
  attempts: number;
  hasProgress?: boolean;
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
          startIcon={status === 'live' && hasProgress ? <ReplayIcon /> : <PlayArrowIcon />}
        >
          {status === 'live' ? (hasProgress ? 'Resume Quiz' : 'Start Quiz') : map.badge}
        </Button>
      </Box>
    </Grid>
  );
}

export function ExamsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      // Fetch all quizzes (exams) from your schema
      const { data, error } = await supabase.from('quizzes').select('*').eq('is_draft', false);
      setExams(data ?? []);
      setLoading(false);
    };
    fetchExams();
  }, []);

  const sidebarLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, onClick: () => router.push('/dashboard/student') },
    { text: 'Exams', icon: <BookIcon />, onClick: () => {}, active: true },
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
          <Typography variant="h5" fontWeight={700} letterSpacing={0.5} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>Exams</Typography>
          <Box display="flex" alignItems="center">
            <Avatar src={user?.imageUrl} alt="pro" sx={{ mr: 2, border: '2px solid #e3e6ef', width: 44, height: 44 }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>{user?.firstName}</Typography>
          </Box>
        </Box>

        {/* Exams Table */}
        <Box p={3} borderRadius={3} boxShadow={2} sx={{ background: '#fff', fontFamily: 'Poppins, sans-serif', maxWidth: 1200, mx: 'auto' }}>
          {loading ? (
            <Box py={6} display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 'none', background: 'transparent' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sl.no</TableCell>
                    <TableCell>Exam Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>No. of questions</TableCell>
                    <TableCell>Exam time</TableCell>
                    <TableCell>Submission time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exams.map((exam, idx) => (
                    <TableRow key={exam.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{exam.quiz_title}</TableCell>
                      <TableCell>{exam.description}</TableCell>
                      <TableCell>{exam.subject || '-'}</TableCell>
                      <TableCell>{exam.nq || '-'}</TableCell>
                      <TableCell>{exam.duration} min</TableCell>
                      <TableCell>{exam.end_time ? new Date(exam.end_time).toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => router.push(`/attempt-quiz/${exam.id}`)}
                          sx={{ borderRadius: 2, fontWeight: 600, fontFamily: 'Poppins, sans-serif', background: '#002366', color: '#fff', '&:hover': { background: '#001b4e' } }}
                        >
                          Start
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    </Box>
  );
}