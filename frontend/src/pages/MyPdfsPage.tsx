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
  submissionFileUrl,
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

  const pageCount = Math.ceil(submissions.length / pageSize);
  const paginatedSubmissions = useMemo(() => {
    return submissions.slice((page - 1) * pageSize, page * pageSize);
  }, [submissions, page]);

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
                    onClick={(e) => e.stopPropagation()}
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
        title="Мои PDF"
        side={
          submissions.length > 0 && !isLoading && !loadError && (
            <Button component={Link} to="/submit" variant="contained">
              Загрузить новый PDF
            </Button>
          )
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
                        onClick={() => setSelectedSubmission(item)}
                        sx={{
                          p: 2.5,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                          justifyContent: "space-between",
                          gap: 2,
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                          "&:hover": {
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
                          },
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
                            onClick={(e) => e.stopPropagation()}
                            sx={{ borderRadius: 2, mt: { xs: 1.5, sm: 0 } }}
                          >
                            Перейти на страницу файла
                          </Button>
                        ) : item.status === "rejected" ? (
                          <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 1.5, sm: 0 }, alignSelf: { sm: "flex-start" } }}>
                            <Button
                              href={submissionFileUrl(item.id, token ?? "")}
                              variant="outlined"
                              color="secondary"
                              size="small"
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              sx={{ borderRadius: 2 }}
                            >
                              Открыть PDF
                            </Button>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 1.5, sm: 0 }, alignSelf: { sm: "flex-start" } }}>
                            <Button
                              href={submissionFileUrl(item.id, token ?? "")}
                              variant="outlined"
                              color="secondary"
                              size="small"
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
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

