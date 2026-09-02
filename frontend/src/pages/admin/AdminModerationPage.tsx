import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  type AdminForm,
  createEmptyForm,
} from "../../components/DocumentFormFields";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { PictureAsPdfRounded as PictureAsPdfRoundedIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import {
  approveSubmission,
  getAdminSubmissions,
  getDocumentTypes,
  rejectSubmission,
  submissionFileUrl,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import { AdminDocumentFullView } from "../../components/AdminDocumentFullView";
import {
  ContentCard,
  statusToneChipSx,
  tableSurfaceSx,
} from "../../components/mui-primitives";
import type {
  SubmissionItem,
  SubmissionStatus,
} from "../../types";

type ModerationFilterValue = SubmissionStatus | "";

function createApprovalForm(item: SubmissionItem): AdminForm {
  return {
    title: item.title,
    titleTranslations: item.titleTranslations || {},
    author: item.author || "",
    executor: item.executor || "",
    scientificAdvisor: item.scientificAdvisor || "",
    year: item.year ?? 0,
    type: item.type || "Учебник",
    placeOfPublication: item.placeOfPublication || "",
    publisher: item.publisher || "",
    periodicalName: item.periodicalName || "",
    volume: item.volume || "",
    description: item.description || "",
    tags: item.tags || "",
    isLocal: item.isLocal,
    file: null,
  };
}

function submissionStatusLabel(status: SubmissionStatus) {
  switch (status) {
    case "approved":
      return "Одобрено";
    case "rejected":
      return "Отклонено";
    default:
      return "Ожидает";
  }
}

function submissionStatusTone(status: SubmissionStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function validateDocumentForm(form: AdminForm, requireFile: boolean) {
  const missing: string[] = [];
  if (!form.title.trim()) missing.push("название");
  if (!form.type.trim()) missing.push("тип");
  if (requireFile && !form.file) missing.push("PDF-файл");
  return missing;
}

function buildDocumentFormData(form: AdminForm) {
  const formData = new FormData();
  formData.set("title", form.title.trim());
  formData.set("author", form.author.trim());
  formData.set("executor", form.executor.trim());
  formData.set("scientificAdvisor", form.scientificAdvisor.trim());
  formData.set("year", String(form.year));
  formData.set("type", form.type.trim());
  formData.set("placeOfPublication", form.placeOfPublication.trim());
  formData.set("publisher", form.publisher.trim());
  formData.set("periodicalName", form.periodicalName.trim());
  formData.set("volume", form.volume.trim());
  formData.set("description", form.description.trim());
  formData.set("tags", form.tags);
  formData.set("isLocal", String(form.isLocal));
  formData.set("titleTranslations", JSON.stringify(form.titleTranslations));

  if (form.file) {
    formData.set("file", form.file);
  }

  return formData;
}

const AdminModerationPage: React.FC = () => {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [moderationStatus, setModerationStatus] = useState<ModerationFilterValue>("pending");
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  
  const [approvingSubmission, setApprovingSubmission] = useState<SubmissionItem | null>(null);
  const [approveForm, setApproveForm] = useState<AdminForm>(() => createEmptyForm());
  const [approveFormError, setApproveFormError] = useState("");
  const [isApprovingSubmission, setIsApprovingSubmission] = useState(false);

  const [approvePreviewUrl, setApprovePreviewUrl] = useState("");
  useEffect(() => {
    if (approveForm.file) {
      const blob = new Blob([approveForm.file], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setApprovePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setApprovePreviewUrl("");
    }
  }, [approveForm.file]);

  const [filterStatus, setFilterStatus] = useState<string>("pending");
  
  async function loadSubmissions() {
    if (!token) return;
    const response = await getAdminSubmissions(token);
    setSubmissions(response.items);
    window.dispatchEvent(new Event("admin_submissions_changed"));
  }

  useEffect(() => {
    if (!token) return;
    loadSubmissions().catch(console.error);
    getDocumentTypes().then((res) => setDocumentTypes(res.items)).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const intervalId = window.setInterval(() => {
      loadSubmissions().catch(console.error);
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [token]);

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((item) => {
        if (moderationStatus && item.status !== moderationStatus) {
          return false;
        }
        return true;
      }),
    [moderationStatus, submissions]
  );

  useEffect(() => {
    setPage(0);
  }, [moderationStatus]);

  const paginatedSubmissions = useMemo(
    () => filteredSubmissions.slice(page * 20, (page + 1) * 20),
    [filteredSubmissions, page]
  );

  function resetApproving() {
    setApprovingSubmission(null);
    setApproveForm(createEmptyForm());
    setApproveFormError("");
    setIsApprovingSubmission(false);
  }

  function startApprove(item: SubmissionItem) {
    if (item.status !== "pending") return;
    setApprovingSubmission(item);
    setApproveForm(createApprovalForm(item));
    setApproveFormError("");
  }

  async function handleApproveSubmission(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !approvingSubmission || isApprovingSubmission) return;

    setApproveFormError("");
    const missing = validateDocumentForm(approveForm, false);
    if (missing.length > 0) {
      setApproveFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }

    try {
      setIsApprovingSubmission(true);
      await approveSubmission(token, approvingSubmission.id, buildDocumentFormData(approveForm));
      await loadSubmissions();
      resetApproving();
    } catch (error) {
      setApproveFormError(resolveErrorMessage(error, "Не удалось одобрить заявку."));
      setIsApprovingSubmission(false);
    }
  }

  async function handleRejectSubmission(item: SubmissionItem) {
    if (!token) return;
    const moderationNote = window.prompt("Причина отклонения (необязательно)", item.moderationNote ?? "");
    if (moderationNote === null) return;

    await rejectSubmission(token, item.id, moderationNote.trim());
    if (approvingSubmission?.id === item.id) {
      resetApproving();
    }
    await loadSubmissions();
  }

  return (
    <AdminFrame title="Модерация">
      <ContentCard>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "flex-end" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6">
                Заявки пользователей
              </Typography>
            </Box>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="admin-mod-filter-label">Статус</InputLabel>
              <Select
                labelId="admin-mod-filter-label"
                value={moderationStatus}
                label="Статус"
                onChange={(e) => setModerationStatus(e.target.value as ModerationFilterValue)}
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value="pending">Ожидают проверки</MenuItem>
                <MenuItem value="approved">Одобренные</MenuItem>
                <MenuItem value="rejected">Отклоненные</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {filteredSubmissions.length === 0 ? (
            moderationStatus === "pending" ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                Все заявки обработаны!
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                В данной категории заявок нет.
              </Alert>
            )
          ) : (
            <TableContainer sx={tableSurfaceSx}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Документ</TableCell>
                    <TableCell>Отправитель</TableCell>
                    <TableCell>Дата</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSubmissions.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ maxWidth: 400 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <PictureAsPdfRoundedIcon color="error" />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600} sx={{
                              lineHeight: 1.2, mb: 0.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              wordBreak: "break-word"
                            }}>
                              {item.title}
                            </Typography>
                            {item.author && (
                              <Typography variant="body2" color="text.secondary" sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word"
                              }}>
                                {item.author}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.uploaderName || item.uploaderUsername || `ID ${item.userId}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.uploaderUsername ? `@${item.uploaderUsername}` : (item.source === "admin_import" ? "Админ-импорт" : "Пользователь")}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2">{formatDate(item.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        {item.status === "rejected" && item.moderationNote ? (
                          <Tooltip title={`Причина: ${item.moderationNote}`} placement="top">
                            <Chip
                              label={submissionStatusLabel(item.status)}
                              size="small"
                              sx={{ ...statusToneChipSx(submissionStatusTone(item.status)), width: 110 }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip
                            label={submissionStatusLabel(item.status)}
                            size="small"
                            sx={{ ...statusToneChipSx(submissionStatusTone(item.status)), width: 110 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {item.status === "pending" ? (
                          <Button size="small" variant="contained" onClick={() => startApprove(item)}>
                            Рассмотреть
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            component={Link}
                            to={`/submissions/${item.id}/read`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Просмотреть
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {filteredSubmissions.length > 20 && (
            <TablePagination
              component="div"
              count={filteredSubmissions.length}
              page={page}
              onPageChange={(_, newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
            />
          )}
        </Stack>
      </ContentCard>

      <AdminDocumentFullView
        open={!!approvingSubmission}
        title="Одобрить заявку"
        subtitle={approvingSubmission?.title}
        pdfUrl={approvePreviewUrl || (approvingSubmission ? submissionFileUrl(approvingSubmission.id, false, approvingSubmission.updatedAt) : "")}
        token={token}
        onClose={resetApproving}
        form={approveForm}
        setForm={setApproveForm}
        error={approveFormError}
        onSubmit={handleApproveSubmission}
        submitLabel={isApprovingSubmission ? "Публикуем..." : "Одобрить и опубликовать"}
        isSubmitting={isApprovingSubmission}
        idPrefix="admin-approve"
        documentTypes={documentTypes}
        secondaryActions={
          <Button
            variant="contained"
            color="error"
            onClick={() => approvingSubmission && void handleRejectSubmission(approvingSubmission)}
          >
            Отклонить заявку
          </Button>
        }
      />
    </AdminFrame>
  );
};

export default AdminModerationPage;
