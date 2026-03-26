import React from "react";
import { Box, Chip, Divider, Paper, Stack, Typography, alpha } from "@mui/material";
import AdminSectionNav from "./AdminSectionNav";
import { eyebrowSx, PageShell } from "./mui-primitives";

type AdminFrameProps = {
  title: string;
  description: string;
  chips?: Array<{ label: string }>;
  children: React.ReactNode;
};

const AdminFrame: React.FC<AdminFrameProps> = ({
  title,
  description,
  chips = [],
  children,
}) => {
  return (
    <PageShell>
      <Paper
        sx={{
          borderRadius: 3.5,
          p: { xs: 2, md: 2.5 },
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(
              theme.palette.background.paper,
              0.95
            )} 66%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Box>
              <Typography variant="caption" sx={eyebrowSx}>
                Админка
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.8 }}>
                {title}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.8, maxWidth: "72ch" }}>
                {description}
              </Typography>
            </Box>

            {chips.length > 0 && (
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                {chips.map((chip) => (
                  <Chip key={chip.label} label={chip.label} />
                ))}
              </Stack>
            )}
          </Stack>

          <Divider />
          <AdminSectionNav />
        </Stack>
      </Paper>

      {children}
    </PageShell>
  );
};

export default AdminFrame;
