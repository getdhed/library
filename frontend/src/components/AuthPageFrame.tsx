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
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 520,
          p: 3,
          borderRadius: 0,
        }}
      >
        <Stack spacing={1.2} sx={{ mb: 2.2 }}>
          <Typography component="h1" variant="h4">
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary">
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
