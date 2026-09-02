import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Pagination,
  alpha,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getDocument,
  getMySubmissions,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import {
  ContentCard,
  eyebrowSx,
  PageHeader,
  PageShell,
  statusToneChipSx,
} from "../components/mui-primitives";
import type { DocumentItem, SubmissionItem, SubmissionStatus } from "../types";

type SubmissionFilter = "all" | SubmissionStatus;
type LocationState = {
  submissionCreated?: boolean;
} | null;

function submissionStatusLabel(status: SubmissionStatus) {
  switch (status) {
    case "approved":
      return "Принято";
    case "rejected":
      return "Отказано";
    default:
      return "В обработке";
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortSubmissions(items: SubmissionItem[]) {
  return [...items].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function submissionStatusTone(status: SubmissionStatus) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "rejected") {
    return "danger" as const;
  }

  return "warning" as const;
}

const detailGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 1.25,
};

const MyPdfsPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState;
  const [showSuccessBanner, setShowSuccessBanner] = useState(
    Boolean(locationState?.submissionCreated)
  );
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (locationState?.submissionCreated) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, locationState?.submissionCreated, navigate]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    getMySubmissions(token)
      .then((response) => {
        if (!cancelled) {
          setSubmissions(sortSubmissions(response.items));
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setLoadError("Не удалось загрузить отправленные PDF.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);
  const pageCount = Math.ceil(submissions.length / pageSize);
  const paginatedSubmissions = useMemo(() => {
    return submissions.slice((page - 1) * pageSize, page * pageSize);
  }, [submissions, page]);



  return (
    <PageShell>
      <Box sx={{ mb: 3, px: 0.5, mt: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
        <Typography variant="h4" fontWeight={700}>
          Мои PDF
        </Typography>
        {submissions.length > 0 && !isLoading && !loadError && (
          <Button component={Link} to="/submit" variant="contained">
            Загрузить новый PDF
          </Button>
        )}
      </Box>

      {showSuccessBanner && (
        <Alert
          severity="success"
          variant="outlined"
          action={
            <Button
              type="button"
              color="inherit"
              size="small"
              onClick={() => setShowSuccessBanner(false)}
            >
              Скрыть
            </Button>
          }
        >
          PDF отправлен на проверку.
        </Alert>
      )}

      {!isLoading && !loadError && submissions.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" color="text.secondary">
            У вас пока нет загруженных PDF
          </Typography>
          <Button component={Link} to="/submit" variant="contained" size="large" sx={{ px: 4, py: 1.5 }}>
            Загрузить новый PDF
          </Button>
        </Box>
      ) : (
        <Stack spacing={2.5}>
              {isLoading && (
                <Typography color="text.secondary">Загружаем ваши PDF...</Typography>
              )}

              {loadError && <Alert severity="error">{loadError}</Alert>}

              {!isLoading && !loadError && submissions.length === 0 && (
                <ContentCard sx={{ p: 4, textAlign: "center" }}>
                  <Typography fontWeight={600} color="text.secondary">У вас пока нет загруженных PDF.</Typography>
                </ContentCard>
              )}

              {!isLoading && !loadError && submissions.length > 0 && (
                <ContentCard sx={{ p: 0, overflow: "hidden" }}>
                  <Stack divider={<Box sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }} />}>
                    {paginatedSubmissions.map((item) => (
                      <Box
                        key={item.id}
                        component="article"
                        sx={{
                          p: 2.5,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Stack spacing={0.75} flex={1} minWidth={0}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip
                              size="small"
                              label={submissionStatusLabel(item.status)}
                              sx={statusToneChipSx(submissionStatusTone(item.status))}
                            />
                          </Stack>

                          <Typography
                            variant="h6"
                            fontWeight={600}
                            sx={{
                              lineHeight: 1.3,
                              letterSpacing: "0.01em",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {item.title}
                          </Typography>

                          <Typography variant="body2" color="text.secondary" noWrap>
                            Отправлено: {formatDateTime(item.createdAt)}
                          </Typography>

                          {item.status === "rejected" && (
                            <Typography variant="body2" color="error.main" sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              <strong>Причина отказа:</strong> {item.moderationNote || "Не указана"}
                            </Typography>
                          )}
                        </Stack>

                        {item.status === "approved" && item.approvedDocumentId ? (
                          <Button
                            component={Link}
                            variant="contained"
                            color="primary"
                            size="small"
                            to={`/documents/${item.approvedDocumentId}`}
                            sx={{ borderRadius: 2, mt: { xs: 1.5, sm: 0 } }}
                          >
                            Перейти на страницу файла
                          </Button>
                        ) : item.status === "rejected" ? (
                          <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 1.5, sm: 0 }, alignSelf: { sm: "flex-start" } }}>
                            <Button
                              component={Link}
                              to={`/submissions/${item.id}/read`}
                              variant="outlined"
                              color="secondary"
                              size="small"
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ borderRadius: 2 }}
                            >
                              Открыть PDF
                            </Button>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 1.5, sm: 0 }, alignSelf: { sm: "flex-start" } }}>
                            <Button
                              component={Link}
                              to={`/submissions/${item.id}/read`}
                              variant="outlined"
                              color="secondary"
                              size="small"
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ borderRadius: 2 }}
                            >
                              Открыть PDF
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </ContentCard>
              )}

              {!isLoading && !loadError && pageCount > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_, val) => setPage(val)}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </Stack>
      )}


    </PageShell>
  );
};

export default MyPdfsPage;

