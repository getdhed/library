import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

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
        // Заготовка под военный тематический фон. 
        // Пока используется темно-зеленый цвет хаки. Потом можно будет заменить url.
        backgroundColor: "#2e382e", // Цвет хаки/милитари
        backgroundImage: "url('/military-bg-placeholder.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          backgroundColor: "rgba(25, 45, 25, 0.85)", // Dark green transparent
          backdropFilter: "blur(8px)",
          color: "white", // White text on dark background
        }}
      >
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Typography component="h1" variant="h5" fontWeight="bold" textAlign="center" color="inherit">
            {title}
          </Typography>
          
          {subtitle && (
            <Typography color="text.secondary" textAlign="center" variant="body2">
              {subtitle}
            </Typography>
          )}
        </Stack>
        {formContent}
      </Paper>
    </Box>
  );
};

export default AuthPageFrame;
