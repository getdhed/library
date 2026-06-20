import React, { useEffect, useState } from "react";
import { Box, Chip, Divider, Paper, Stack, Typography, alpha } from "@mui/material";
import AdminSectionNav from "./AdminSectionNav";
import { PageShell } from "./mui-primitives";

type AdminFrameProps = {
  title: string;
  children: React.ReactNode;
};

const AdminFrame: React.FC<AdminFrameProps> = ({ children }) => {
  return (
    <PageShell>
      <Paper
        sx={{
          borderRadius: 0,
          px: 2.5,
          pt: 1.5,
          pb: 2,
          borderColor: (theme) => alpha(theme.palette.divider, 0.95),
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ mt: 0, mb: 0 }}>
              Панель администратора
            </Typography>
          </Box>

          <Divider />
          <AdminSectionNav />
        </Stack>
      </Paper>

      {children}
    </PageShell>
  );
};

export default AdminFrame;
