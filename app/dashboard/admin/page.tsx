"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, TextField, Button, MenuItem, Typography, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, Toolbar, Grid, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  BarChart as BarChartIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { supabase } from '@/utils/supabaseClient';

const sidebarLinks = [
  { text: 'Dashboard', icon: <DashboardIcon />, tab: 'dashboard' },
  { text: 'Manage Users', icon: <GroupIcon />, tab: 'users' },
  { text: 'Manage Quizzes', icon: <AssignmentIcon />, tab: 'quizzes' },
  { text: 'Results', icon: <BarChartIcon />, tab: 'results' },
  { text: 'Announcements', icon: <MessageIcon />, tab: 'announcements' },
  { text: 'Settings', icon: <SettingsIcon />, tab: 'settings' },
  { text: 'Help', icon: <HelpIcon />, tab: 'help' },
  { text: 'Log out', icon: <LogoutIcon />, tab: 'logout' },
];

export default function AdminDashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // User creation form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  // Fetch counts and lists from unified users table
  const fetchCountsAndLists = async () => {
    setLoading(true);
    // Fetch all users
    let users = [];
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      users = data || [];
    } catch (err) {
      users = [];
    }
    // Count by role
    setStudentCount(users.filter((u: any) => u.role === 'student').length);
    setTeacherCount(users.filter((u: any) => u.role === 'teacher').length);
    setAdminCount(users.filter((u: any) => u.role === 'admin').length);
    setStudents(users.filter((u: any) => u.role === 'student'));
    setTeachers(users.filter((u: any) => u.role === 'teacher'));
    // Quizzes count (still from quizzes table)
    try {
      const { count: quizzes } = await supabase.from('quizzes').select('id', { count: 'exact', head: true });
      setQuizCount(quizzes || 0);
    } catch (err) {
      setQuizCount(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCountsAndLists();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Creating user...");
    setErrorDetails([]);
    setCreating(true);
    try {
      const res = await fetch("/api/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("User creation error:", data.error || data.message, data.details);
        setMessage("❌ " + (data.error || data.message || "Unknown error"));
        // If details is an array, show each error message
        if (Array.isArray(data.details)) {
          setErrorDetails(data.details.map((d: any) => d.longMessage || d.message || JSON.stringify(d)));
        } else if (typeof data.details === 'string') {
          setErrorDetails([data.details]);
        } else {
          setErrorDetails([]);
        }
      } else {
        setMessage("✅ User created successfully!");
        setFormData({ firstName: "", lastName: "", username: "", email: "", password: "", role: "student" });
        await fetchCountsAndLists(); // Refresh lists and counts in real time
      }
    } catch (error: any) {
      console.error("Network or unexpected error:", error);
      setMessage("❌ " + (error.message || "Network error"));
      setErrorDetails([]);
    } finally {
      setCreating(false);
    }
  };

  // Sidebar click handler
  const handleSidebarClick = (tab: string) => {
    if (tab === 'logout') {
      setLogoutDialogOpen(true);
    } else {
      setSelectedTab(tab);
    }
  };

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserDisplayName = () => {
    if (!user) return "Loading...";
    return (
      user.firstName ||
      user.fullName ||
      user.username ||
      (user.emailAddresses && user.emailAddresses[0]?.emailAddress) ||
      "Admin"
    );
  };

  return (
    <Box sx={{ display: 'flex', fontFamily: 'Poppins, sans-serif' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 220,
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
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: 22, letterSpacing: 1 }}>Admin</Typography>
        </Box>
        <List sx={{ mt: 2 }}>
          {sidebarLinks.map((link) => (
            <ListItem
              button
              key={link.text}
              onClick={() => handleSidebarClick(link.tab)}
              sx={{
                color: link.tab === selectedTab ? '#1565c0' : '#fff',
                background: link.tab === selectedTab ? '#e3e6ef' : 'none',
                borderRadius: '30px 0 0 30px',
                mb: 1,
                fontWeight: link.tab === selectedTab ? 600 : 400,
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
          <Typography variant="h5" fontWeight={700} letterSpacing={0.5} sx={{ color: '#002366', fontFamily: 'Poppins, sans-serif' }}>Admin Dashboard</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle1" fontWeight={500}>
              {getGreeting()}, {getUserDisplayName()}
            </Typography>
            <ThemeToggleButton />
        </Box>
      </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 4, background: '#e3f2fd', border: '3px solid #1976d2' }}>
              <GroupIcon sx={{ color: '#1976d2', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#1976d2">Students</Typography>
              <Typography variant="h2" fontWeight={900} color="#1976d2">{loading ? <CircularProgress size={32} /> : studentCount}</Typography>
              <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 16 }}>Total students</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 4, background: '#f3e5f5', border: '3px solid #7b1fa2' }}>
              <GroupIcon sx={{ color: '#7b1fa2', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#7b1fa2">Teachers</Typography>
              <Typography variant="h2" fontWeight={900} color="#7b1fa2">{loading ? <CircularProgress size={32} /> : teacherCount}</Typography>
              <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 16 }}>Total teachers</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 4, background: '#fffde7', border: '3px solid #fbc02d' }}>
              <GroupIcon sx={{ color: '#fbc02d', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#fbc02d">Admins</Typography>
              <Typography variant="h2" fontWeight={900} color="#fbc02d">{loading ? <CircularProgress size={32} /> : adminCount}</Typography>
              <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 16 }}>Total admins</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 4, border: '3px solid #1565c0' }}>
              <AssignmentIcon sx={{ color: '#1565c0', fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#1565c0">Quizzes</Typography>
              <Typography variant="h2" fontWeight={900} color="#1565c0">{loading ? <CircularProgress size={32} /> : quizCount}</Typography>
              <Typography sx={{ opacity: 0.8, color: '#555', fontSize: 16 }}>Total quizzes</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Main Section Content */}
        {selectedTab === 'dashboard' && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Welcome to the Admin Dashboard!</Typography>
            <Typography>Use the sidebar to manage users, view results, send announcements, and more.</Typography>
          </Box>
        )}
        {selectedTab === 'users' && (
          <Box maxWidth={1100} mx="auto">
            <Typography variant="h6" fontWeight={700} mb={2}>Create New User</Typography>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <TextField
                  name="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  fullWidth
                />
                <TextField
                  name="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
              <TextField
                name="username"
                label="Username (optional)"
                value={formData.username}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                fullWidth
              />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, mt: -2 }}>
                Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, 1 special character, and must not be a commonly breached password.
              </Typography>
              <TextField
                name="role"
                label="Role"
                select
                value={formData.role}
                onChange={handleChange}
                required
                fullWidth
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </TextField>
              <Button type="submit" variant="contained" color="primary" size="large" sx={{ fontWeight: 700, py: 1.5 }} disabled={creating}>
                {creating ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create User'}
              </Button>
            </form>
            {message && <Typography mt={3} align="center" color={message.startsWith("✅") ? "success.main" : "error.main"}>{message}</Typography>}
            {errorDetails.length > 0 && (
              <Box mt={2}>
                <Typography color="error" fontWeight={600} mb={1}>Please fix the following:</Typography>
                <ul style={{ color: '#d32f2f', margin: 0, paddingLeft: 20 }}>
                  {errorDetails.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </Box>
            )}
            <Box mt={6}>
              <Tabs value={0} aria-label="user type tabs" sx={{ mb: 2 }}>
                <Tab label="Students" />
                <Tab label="Teachers" />
              </Tabs>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1}>Student List</Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.id}</TableCell>
                            <TableCell>{student.fname || student.firstName} {student.lname || student.lastName}</TableCell>
                            <TableCell>{student.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1}>Teacher List</Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {teachers.map((teacher) => (
                          <TableRow key={teacher.id}>
                            <TableCell>{teacher.id}</TableCell>
                            <TableCell>{teacher.fname || teacher.firstName} {teacher.lname || teacher.lastName}</TableCell>
                            <TableCell>{teacher.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
        </Grid>
      </Grid>
            </Box>
          </Box>
        )}
        {selectedTab === 'quizzes' && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Manage Quizzes</Typography>
            <Typography>Quiz management coming soon.</Typography>
          </Box>
        )}
        {selectedTab === 'results' && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Results Section</Typography>
            <Typography>Results management coming soon.</Typography>
          </Box>
        )}
        {selectedTab === 'announcements' && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Announcements Section</Typography>
            <Typography>Announcements management coming soon.</Typography>
          </Box>
        )}
        {selectedTab === 'settings' && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Settings Section</Typography>
            <Typography>Settings management coming soon.</Typography>
          </Box>
        )}
        {selectedTab === 'help' && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Help Section</Typography>
            <Typography>Help content coming soon.</Typography>
          </Box>
        )}

        {/* Logout Confirmation Dialog */}
        <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
          <Card sx={{ minWidth: 340, p: 2, boxShadow: 0 }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: 22, textAlign: 'center' }}>Log Out</DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
                Are you sure you want to log out?
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={() => setLogoutDialogOpen(false)} variant="outlined" color="primary">
                Cancel
              </Button>
              <Button onClick={() => { setLogoutDialogOpen(false); signOut(); }} variant="contained" color="error" sx={{ ml: 2 }}>
                Log Out
              </Button>
            </DialogActions>
          </Card>
        </Dialog>
      </Box>
    </Box>
  );
}
