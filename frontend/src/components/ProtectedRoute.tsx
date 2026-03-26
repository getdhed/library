import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function LoadingState() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        gap: 1.5,
      }}
    >
      <CircularProgress size={26} />
      <Typography color="text.secondary">Loading...</Typography>
    </Box>
  );
}

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.ready) {
    return <LoadingState />;
  }

  if (!auth.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const auth = useAuth();

  if (!auth.ready) {
    return <LoadingState />;
  }

  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

