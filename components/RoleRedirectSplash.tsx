import { Box, Typography, CircularProgress } from "@mui/material";

interface RoleRedirectSplashProps {
  name: string;
  role: "admin" | "teacher" | "student" | string;
}

export default function RoleRedirectSplash({ name, role }: RoleRedirectSplashProps) {
  const roleDisplayMap = {
    admin: "Administrator",
    teacher: "Educator",
    student: "Student",
    default: "User"
  };

  const roleDisplay = roleDisplayMap[role as keyof typeof roleDisplayMap] || roleDisplayMap.default;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `
          linear-gradient(135deg, #0f172a 0%, #1e293b 100%),
          radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 25%)
        `,
        color: "#f8fafc",
        textAlign: "center",
        padding: 4,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Subtle grid overlay */}
      <Box 
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          pointerEvents: "none"
        }} 
      />

      <Box 
        sx={{ 
          position: "relative",
          zIndex: 1,
          maxWidth: "800px",
          width: "100%"
        }}
      >
        <Typography 
          component="h1"
          variant="h4"
          fontWeight={600}
          mb={3}
          sx={{
            color: "#ffffff",
            letterSpacing: "0.3px",
            lineHeight: 1.3
          }}
        >
          Welcome, {name}
        </Typography>

        <Typography
          component="p"
          variant="h6"
          mb={4}
          sx={{
            color: "#e2e8f0",
            fontWeight: 400,
            "& strong": {
              color: "#38bdf8",
              fontWeight: 500
            }
          }}
        >
          Loading <strong>{roleDisplay}</strong> dashboard...
        </Typography>

        <CircularProgress 
          size={72}
          thickness={4}
          sx={{ 
            color: "#38bdf8",
            mb: 5,
            "& .MuiCircularProgress-circle": {
              strokeLinecap: "round"
            }
          }} 
        />

        <Typography 
          component="p"
          variant="body2"
          sx={{
            color: "#94a3b8",
            fontStyle: "italic",
            maxWidth: "600px",
            mx: "auto",
            "&::before": { content: '"“"', mr: 0.5 },
            "&::after": { content: '"”"', ml: 0.5 }
          }}
        >
          Please wait while we prepare your workspace
        </Typography>
      </Box>
    </Box>
  );
}