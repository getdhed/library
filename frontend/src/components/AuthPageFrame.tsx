import React from "react";
import { Box, Paper, Stack, Typography, createTheme, ThemeProvider } from "@mui/material";

const darkAuthTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#ffffff", // Белый акцент для минимализма на темном фоне
    },
    background: {
      paper: "transparent",
      default: "transparent",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 0,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(4px)",
            transition: "all 0.2s",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
            "&.Mui-focused": {
              backgroundColor: "rgba(255, 255, 255, 0.12)",
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          "&:-webkit-autofill": {
            transition: "background-color 9999s ease-in-out 0s",
            WebkitTextFillColor: "white",
            caretColor: "white",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: "12px 24px",
          fontWeight: 600,
          textTransform: "none",
          fontSize: "1rem",
        },
        contained: {
          backgroundColor: "#ffffff",
          color: "#000000",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.8)",
          },
        },
      },
    },
  },
});

type AuthPageFrameProps = {
  title: string;
  subtitle?: string;
  formContent: React.ReactNode;
};

const AuthPageFrame: React.FC<AuthPageFrameProps> = ({
  title,
  subtitle,
  formContent,
}) => {
  return (
    <Box
      component="main"
      id="auth-main-content"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 3,
        py: 4,
        backgroundColor: "#121212", 
        backgroundImage: "url('/auth-bg.png?v=2')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)", // Затемнение фона
          zIndex: 0,
        }
      }}
    >
      <Paper
        elevation={24}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 400,
          p: { xs: 4, sm: 5 },
          borderRadius: 4,
          backgroundColor: "rgba(20, 20, 20, 0.65)", // Темный полупрозрачный фон
          backdropFilter: "blur(16px)", // Сильное размытие заднего фона
          border: "1px solid rgba(255, 255, 255, 0.1)", // Тонкая светлая рамка
          color: "white",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <ThemeProvider theme={darkAuthTheme}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
              <Box 
                component="img" 
                src="/ips-logo.png" 
                alt="Герб ИПС" 
                sx={{ 
                  height: 70, 
                  objectFit: "contain" 
                }} 
              />
              <Typography 
                variant="body1" 
                fontWeight="bold" 
                sx={{ 
                  lineHeight: 1.2, 
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: 0.5,
                }}
              >
                Институт<br />
                пограничной<br />
                службы
              </Typography>
            </Stack>
            <Typography component="h1" variant="h4" fontWeight="bold" textAlign="center" color="inherit">
              {title}
            </Typography>
            
            {subtitle && (
              <Typography color="rgba(255, 255, 255, 0.7)" textAlign="center" variant="body1">
                {subtitle}
              </Typography>
            )}
          </Stack>
          {formContent}
        </ThemeProvider>
      </Paper>
    </Box>
  );
};

export default AuthPageFrame;
