import React from "react";
import { Box } from "@mui/material";

type PdfViewerProps = {
  url: string;
};

/**
 * PdfViewer — uses the official Mozilla PDF.js pre-built viewer.
 * The viewer is served from the /pdfjs/web/viewer.html static file.
 * It provides virtualization, search, thumbnails, outlines, and printing out of the box.
 */
const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  // Construct the URL to the static PDF.js viewer, passing our PDF url as a query parameter.
  const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}`;

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
