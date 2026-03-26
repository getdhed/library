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
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
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
          borderRadius: 999,
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
            {renderDetailField("Подразделение", selectedSubmission.department || "Не указано")}
          </Box>

          {selectedSubmission.comment && (
            <Typography>
              Комментарий к заявке: {selectedSubmission.comment}
            </Typography>
          )}

          <Box>
            <Button
              component="a"
              variant="outlined"
              href={submissionFileUrl(
                selectedSubmission.id,
                token ?? "",
                false,
                selectedSubmission.updatedAt
              )}
              target="_blank"
              rel="noreferrer"
            >
              Открыть исходный PDF
            </Button>
          </Box>
        </Stack>

        {selectedSubmission.status === "pending" && (
          <Stack component="section" spacing={1}>
            <Typography variant="h6">Что сейчас происходит</Typography>
            <Typography>
              Заявка уже принята системой и ожидает проверки модератором. Когда
              решение будет принято, карточка поднимется выше в списке, а здесь
              появятся итоговые детали.
            </Typography>
          </Stack>
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
                  {renderDetailField("Подразделение", detailDocument.department)}
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
        description="Отслеживайте все отправленные файлы, решения модерации и итоговые изменения после принятия документа в каталог."
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
          <strong>PDF отправлен на проверку.</strong>
          <Typography component="span" sx={{ display: "block", mt: 0.4 }}>
            Как только модератор примет решение, статус обновится в этом
            разделе.
          </Typography>
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <Paper component="article" sx={{ p: 2.25, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            В обработке
          </Typography>
          <Typography variant="h4">{stats.pending}</Typography>
        </Paper>

        <Paper component="article" sx={{ p: 2.25, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Принято
          </Typography>
          <Typography variant="h4">{stats.approved}</Typography>
        </Paper>

        <Paper component="article" sx={{ p: 2.25, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Отказано
          </Typography>
          <Typography variant="h4">{stats.rejected}</Typography>
        </Paper>
      </Box>

      <ContentCard>
        <Stack spacing={2}>
          <Stack>
            <Typography
              variant="caption"
              sx={eyebrowSx}
            >
              История файлов
            </Typography>
            <Typography variant="h5">Отправленные PDF</Typography>
          </Stack>

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
            <Paper sx={{ p: 2.25, borderRadius: 2.5 }}>
              <Typography fontWeight={700}>
                Пока нет файлов по выбранному фильтру.
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.4 }}>
                Отправьте первый PDF на проверку или переключите фильтр, чтобы
                увидеть другие заявки.
              </Typography>
            </Paper>
          )}

          {!isLoading && !loadError && filteredSubmissions.length > 0 && (
            <Stack spacing={1.5}>
              {filteredSubmissions.map((item) => (
                <Paper
                  key={item.id}
                  component="article"
                  sx={{ p: 2.25, borderRadius: 3, display: "grid", gap: 1.5 }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Box>
                      <Typography component="h3" variant="h6">
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Исходный файл: {item.fileName}
                      </Typography>
                    </Box>

                    <Chip
                      label={submissionStatusLabel(item.status)}
                      sx={statusToneChipSx(submissionStatusTone(item.status))}
                    />
                  </Stack>

                  <Box
                    component="dl"
                    sx={{
                      ...detailGridSx,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(3, minmax(0, 1fr))",
                      },
                    }}
                  >
                    {renderDetailField("Отправлен", formatDateTime(item.createdAt))}
                    {renderDetailField(
                      "Последнее изменение",
                      formatDateTime(item.updatedAt)
                    )}
                    {renderDetailField("Подразделение", item.department || "Не указано")}
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="contained"
                      type="button"
                      onClick={() => setSelectedSubmission(item)}
                    >
                      Подробнее
                    </Button>
                    <Button
                      component="a"
                      variant="outlined"
                      href={submissionFileUrl(item.id, token ?? "", false, item.updatedAt)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть PDF
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </ContentCard>

      <Drawer
        anchor="right"
        open={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        PaperProps={{
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": "submission-detail-title",
          sx: {
            width: { xs: "100%", sm: "min(560px, 100vw)" },
            p: 2.25,
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            gap: 1.5,
          },
        }}
      >
        {selectedSubmission && (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
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
              <Button type="button" variant="outlined" onClick={() => setSelectedSubmission(null)}>
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
