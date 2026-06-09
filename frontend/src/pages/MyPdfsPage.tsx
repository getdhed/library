import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  Paper,
  Stack,
  Typography,
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
    const updatedDiff =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
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
  const [filter, setFilter] = useState<SubmissionFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionItem | null>(null);
  const [detailDocument, setDetailDocument] = useState<DocumentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

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

  useEffect(() => {
    if (!selectedSubmission) {
      setDetailDocument(null);
      setDetailLoading(false);
      setDetailError("");
      return;
    }

    if (selectedSubmission.status !== "approved") {
      setDetailDocument(null);
      setDetailLoading(false);
      setDetailError("");
      return;
    }

    if (!selectedSubmission.approvedDocumentId || !token) {
      setDetailDocument(null);
      setDetailLoading(false);
      setDetailError("Итоговый документ пока недоступен.");
      return;
    }

    let cancelled = false;
    setDetailDocument(null);
    setDetailError("");
    setDetailLoading(true);

    getDocument(token, selectedSubmission.approvedDocumentId)
      .then((document) => {
        if (!cancelled) {
          setDetailDocument(document);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setDetailError("Не удалось загрузить итоговый документ.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSubmission, token]);

  const stats = useMemo(
    () => ({
      pending: submissions.filter((item) => item.status === "pending").length,
      approved: submissions.filter((item) => item.status === "approved").length,
      rejected: submissions.filter((item) => item.status === "rejected").length,
    }),
    [submissions]
  );

  const filteredSubmissions = useMemo(() => {
    if (filter === "all") {
      return submissions;
    }

    return submissions.filter((item) => item.status === filter);
  }, [filter, submissions]);

  function renderFilterButton(value: SubmissionFilter, label: string, count: number) {
    const active = filter === value;

    return (
      <Button
        key={value}
        type="button"
        variant={active ? "contained" : "outlined"}
        color="primary"
        aria-pressed={active}
        onClick={() => setFilter(value)}
        sx={{
          minHeight: 42,
          borderRadius: 0,
          px: 1.5,
          textTransform: "none",
          fontWeight: 700,
          justifyContent: "flex-start",
          ...(active
            ? {
                boxShadow: (theme) => `0 10px 24px ${alpha(theme.palette.primary.main, 0.22)}`,
              }
            : {
                backgroundColor: "background.paper",
                borderColor: (theme) => alpha(theme.palette.divider, 0.95),
              }),
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <span>{label}</span>
          <Chip size="small" label={count} />
        </Stack>
      </Button>
    );
  }

  function renderDetailField(label: string, value: React.ReactNode) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    );
  }

  function renderDetailContent() {
    if (!selectedSubmission) {
      return null;
    }

    return (
      <Stack spacing={2.25}>
        <Stack component="section" spacing={1.4}>
          <Typography variant="h6">Исходная заявка</Typography>
          <Box component="dl" sx={detailGridSx}>
            {renderDetailField("Название", selectedSubmission.title)}
            {renderDetailField("Исходный файл", selectedSubmission.fileName)}
            {renderDetailField("Статус", submissionStatusLabel(selectedSubmission.status))}
            {renderDetailField("Отправлен", formatDateTime(selectedSubmission.createdAt))}
            {renderDetailField(
              "Последнее изменение",
              formatDateTime(selectedSubmission.updatedAt)
            )}
          </Box>

          {selectedSubmission.comment && (
            <Typography>
              Комментарий к заявке: {selectedSubmission.comment}
            </Typography>
          )}

          <Box>
            <Button
              component={Link}
              variant="outlined"
              to={`/submissions/${selectedSubmission.id}/read`}
            >
              Открыть исходный PDF
            </Button>
          </Box>
        </Stack>

        {selectedSubmission.status === "pending" && (
          <Alert severity="info" variant="outlined">
            Заявка в обработке.
          </Alert>
        )}

        {selectedSubmission.status === "rejected" && (
          <Stack component="section" spacing={1}>
            <Typography variant="h6">Причина отказа</Typography>
            <Alert severity="error" variant="outlined">
              {selectedSubmission.moderationNote || "Причина отказа не указана."}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Решение принято:{" "}
              {formatDateTime(
                selectedSubmission.reviewedAt ?? selectedSubmission.updatedAt
              )}
            </Typography>
          </Stack>
        )}

        {selectedSubmission.status === "approved" && (
          <Stack component="section" spacing={1.25}>
            <Typography variant="h6">Итоговый документ в каталоге</Typography>

            {detailLoading && (
              <Typography color="text.secondary">
                Загружаем итоговые данные документа...
              </Typography>
            )}

            {detailError && <Alert severity="error">{detailError}</Alert>}

            {detailDocument && (
              <>
                <Box component="dl" sx={detailGridSx}>
                  {renderDetailField("Название в каталоге", detailDocument.title)}
                  {renderDetailField("Файл в каталоге", detailDocument.fileName)}
                  {renderDetailField("Автор", detailDocument.author)}
                </Box>

                <Box>
                  <Button
                    component={Link}
                    variant="contained"
                    to={`/documents/${detailDocument.id}`}
                  >
                    Открыть документ
                  </Button>
                </Box>
              </>
            )}
          </Stack>
        )}
      </Stack>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Аккаунт"
        title="Мои PDF"
        side={
          <Button component={Link} to="/submit" variant="contained">
            Загрузить новый PDF
          </Button>
        }
      />

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
        <ContentCard>
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="h5">У вас пока нет отправленных PDF</Typography>
            <Typography color="text.secondary">
              Вы ещё не отправляли файлы на модерацию.
            </Typography>
          </Stack>
        </ContentCard>
      ) : (
        <Stack spacing={2.5}>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                role="toolbar"
                aria-label="Фильтр заявок"
              >
                {renderFilterButton("all", "Все", submissions.length)}
                {renderFilterButton("pending", "В обработке", stats.pending)}
                {renderFilterButton("approved", "Принято", stats.approved)}
                {renderFilterButton("rejected", "Отказано", stats.rejected)}
              </Stack>

              {isLoading && (
                <Typography color="text.secondary">Загружаем ваши PDF...</Typography>
              )}

              {loadError && <Alert severity="error">{loadError}</Alert>}

              {!isLoading && !loadError && filteredSubmissions.length === 0 && (
                <Paper sx={{ p: 2.25, borderRadius: 0 }}>
                  <Typography fontWeight={700}>Нет файлов.</Typography>
                </Paper>
              )}

              {!isLoading && !loadError && filteredSubmissions.length > 0 && (
                <Stack spacing={0}>
                  {filteredSubmissions.map((item) => (
                    <Paper
                      key={item.id}
                      component="article"
                      elevation={0}
                      sx={{
                        p: 1.8,
                        borderRadius: 0,
                        borderBottom: (theme) => `2px solid ${alpha(theme.palette.divider, 1)}`,
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                        backgroundColor: "transparent",
                        transition: "background-color 0.15s ease",
                        "&:hover": {
                          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        },
                        "&:last-of-type": {
                          borderBottom: "none",
                        }
                      }}
                    >
                      <Stack spacing={0.75} flex={1} minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            size="small"
                            label={submissionStatusLabel(item.status)}
                            sx={statusToneChipSx(submissionStatusTone(item.status))}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Обновлено: {formatDateTime(item.updatedAt)}
                          </Typography>
                        </Stack>

                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{
                            lineHeight: 1.2,
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
                          Файл: {item.fileName} • Отправлено: {formatDateTime(item.createdAt)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
                        <Button
                          variant="outlined"
                          size="small"
                          type="button"
                          onClick={() => setSelectedSubmission(item)}
                          sx={{ borderRadius: 0 }}
                        >
                          Подробнее
                        </Button>
                        <Button
                          component={Link}
                          variant="outlined"
                          size="small"
                          to={`/submissions/${item.id}/read`}
                          sx={{ borderRadius: 0 }}
                        >
                          PDF
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        PaperProps={{
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": "submission-detail-title",
          sx: {
            width: 560,
            p: 2.25,
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            gap: 1.5,
            borderRadius: 0,
          },
        }}
      >
        {selectedSubmission && (
          <>
            <Stack
              direction="row"
              spacing={1.25}
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={eyebrowSx}
                >
                  Мои PDF
                </Typography>
                <Typography id="submission-detail-title" variant="h5">
                  {selectedSubmission.title}
                </Typography>
                <Typography color="text.secondary">
                  Статус: {submissionStatusLabel(selectedSubmission.status)}
                </Typography>
              </Box>
              <Button
                type="button"
                variant="outlined"
                onClick={() => setSelectedSubmission(null)}
                sx={{ borderRadius: 0 }}
              >
                Закрыть
              </Button>
            </Stack>

            <Box sx={{ overflowY: "auto", pr: 0.5 }}>{renderDetailContent()}</Box>
          </>
        )}
      </Drawer>
    </PageShell>
  );
};

export default MyPdfsPage;

