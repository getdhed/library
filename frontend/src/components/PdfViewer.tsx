import React from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useProtectedBlobUrl } from "./useProtectedBlobUrl";

type PdfViewerProps = {
  url: string;
  token?: string | null;
};

/**
 * PdfViewer — uses the official Mozilla PDF.js pre-built viewer.
 * The viewer is served from the /pdfjs/web/viewer.html static file.
 * It provides virtualization, search, thumbnails, outlines, and printing out of the box.
 */
const PdfViewer: React.FC<PdfViewerProps> = ({ url, token }) => {
  const { url: blobUrl, isLoading, error } = useProtectedBlobUrl(url, token);
  const viewerUrl = blobUrl
    ? `/pdfjs/web/viewer.html?file=${encodeURIComponent(blobUrl)}`
    : "";

  if (isLoading) {
    return (
      <Stack flex={1} alignItems="center" justifyContent="center" spacing={1.2} role="status">
        <CircularProgress size={28} />
        <Typography>Загружаем PDF...</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Не удалось загрузить PDF.</Alert>
      </Box>
    );
  }

  if (!viewerUrl) {
    return null;
  }

  return (
    <Box
      component="iframe"
      src={viewerUrl}
      title="PDF Viewer"
      sx={{
        flex: 1,
        width: "100%",
        height: "100%",
        border: 0,
        bgcolor: "common.white",
      }}
    />
  );
};

export default PdfViewer;
