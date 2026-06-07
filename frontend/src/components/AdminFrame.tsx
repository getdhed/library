import React from "react";
import { Box, Chip, Divider, Paper, Stack, Typography, alpha } from "@mui/material";
import AdminSectionNav from "./AdminSectionNav";
import { eyebrowSx, PageShell } from "./mui-primitives";

type AdminFrameProps = {
  title: string;
  chips?: Array<{ label: string }>;
  children: React.ReactNode;
};

const AdminFrame: React.FC<AdminFrameProps> = ({
  title,
  chips = [],
  children,
}) => {
  return (
    <PageShell>
      <Paper
        sx={{
          borderRadius: 0,
          p: 2.5,
          borderColor: (theme) => alpha(theme.palette.divider, 0.95),
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="caption" sx={eyebrowSx}>
                Админка
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.8 }}>
                {title}
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
