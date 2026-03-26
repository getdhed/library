import React from "react";
import { Box, Chip, Grid, Paper, Typography } from "@mui/material";
import { eyebrowSx } from "./mui-primitives";

type AuthHighlight = {
  label: string;
  value: string;
};

type AuthPageFrameProps = {
  heroBadge: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  highlights: AuthHighlight[];
  formContent: React.ReactNode;
};

const AuthPageFrame: React.FC<AuthPageFrameProps> = ({
  heroBadge,
  heroEyebrow,
  heroTitle,
  heroDescription,
  highlights,
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
        px: { xs: 2, sm: 3 },
        py: 4,
      }}
    >
      <Grid container spacing={3} maxWidth={1180}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              height: "100%",
              color: "#f6fff7",
              background:
                "linear-gradient(155deg, rgba(7,68,74,0.92) 0%, rgba(10,108,116,0.92) 52%, rgba(7,68,74,0.94) 100%)",
            }}
          >
            <Chip
              label={heroBadge}
              sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.16)", color: "inherit" }}
            />
            <Typography variant="caption" sx={[eyebrowSx, { color: "inherit", opacity: 0.9 }]}>
              {heroEyebrow}
            </Typography>
            <Typography component="h1" variant="h3" sx={{ mt: 1.2, mb: 1.8, maxWidth: "12ch" }}>
              {heroTitle}
            </Typography>
            <Typography sx={{ color: "rgba(246,255,247,0.86)", maxWidth: "58ch" }}>
              {heroDescription}
            </Typography>

            <Grid container spacing={1.5} sx={{ mt: 2.5 }}>
              {highlights.map((item) => (
                <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    sx={{
                      p: 1.8,
                      height: "100%",
                      borderRadius: 2.5,
                      backgroundColor: "rgba(255,255,255,0.14)",
                      borderColor: "rgba(255,255,255,0.2)",
                      color: "inherit",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.78 }}
                    >
                      {item.label}
                    </Typography>
                    <Typography sx={{ mt: 1, fontWeight: 600, lineHeight: 1.55 }}>
                      {item.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: { xs: 2.5, md: 3.2 }, borderRadius: 4 }}>
            {formContent}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AuthPageFrame;
