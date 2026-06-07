import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardActions,
  CardContent,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,

  IconButton,
  InputLabel,

  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  DocumentFormFields,
  type AdminForm,
  createEmptyForm,
} from "../../components/DocumentFormFields";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import {
  approveSubmission,
  createDocument,
  deleteDocument,
  getAdminDocuments,
  getAdminSubmissions,
  getDocumentTypes,

  rejectSubmission,
  submissionFileUrl,
  documentFileUrl,
  updateDocument,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import {
  cardActionIconButtonDangerSx,
  cardActionIconButtonPrimarySx,
  cardActionIconButtonSx,
  ContentCard,
  eyebrowSx,
  filterPanelSx,
  statusToneChipSx,
  tableSurfaceSx,
} from "../../components/mui-primitives";
import type {
  DocumentItem,
  PagedDocuments,
  SubmissionItem,
  SubmissionStatus,
} from "../../types";

type AdminTab = "moderation" | "catalog" | "upload";
type ModerationFilterValue = SubmissionStatus | "";



type ModerationFullViewProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  pdfUrl: string;
  onClose: () => void;
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  error?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  secondaryActions?: React.ReactNode;
  idPrefix: string;
  fileLabel?: string;
  documentTypes: string[];
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "moderation", label: "Модерация" },
  { id: "catalog", label: "Каталог" },
  { id: "upload", label: "Загрузка" },
];



function createEditForm(item: DocumentItem): AdminForm {
  return {
    title: item.title,
    author: item.author,
    executor: item.executor || "",
    scientificAdvisor: item.scientificAdvisor || "",
    year: item.year,
    type: item.type,
    placeOfPublication: item.placeOfPublication || "",
    publisher: item.publisher || "",
    periodicalName: item.periodicalName || "",
    volume: item.volume || "",
    description: item.description,
    tags: item.tags.join(", "),

    file: null,
  };
}

function createApprovalForm(item: SubmissionItem): AdminForm {
  return {
    title: item.title,
    author: item.author || "",
    executor: item.executor || "",
    scientificAdvisor: item.scientificAdvisor || "",
    year: new Date().getFullYear(),
    type: "Учебник",
    placeOfPublication: item.placeOfPublication || "",
    publisher: item.publisher || "",
    periodicalName: item.periodicalName || "",
    volume: item.volume || "",
    description: "",
    tags: "",

    file: null,
  };
}

function isAdminTab(value: string | null): value is AdminTab {
  return value === "moderation" || value === "catalog" || value === "upload";
}

function submissionStatusLabel(status: SubmissionStatus) {
  switch (status) {
    case "approved":
      return "Одобрено";
    case "rejected":
      return "Отклонено";
    default:
      return "На модерации";
  }
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

  if (!form.title.trim()) {
    missing.push("название");
  }

  if (!Number.isFinite(form.year) || form.year <= 0) {
    missing.push("год");
  }
  if (!form.type.trim()) {
    missing.push("тип");
  }
  if (!form.description.trim()) {
    missing.push("описание");
  }
  if (requireFile && !form.file) {
    missing.push("PDF-файл");
  }

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


  if (form.file) {
    formData.set("file", form.file);
  }

  return formData;
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



const ModerationFullView: React.FC<ModerationFullViewProps> = ({
  open,
  title,
  subtitle,
  pdfUrl,
  onClose,
  form,
  setForm,
  error,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  secondaryActions,
  idPrefix,
  fileLabel,
  documentTypes,
}) => {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 100,
        bgcolor: "background.default",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
            <IconButton onClick={onClose} edge="start" aria-label="Закрыть">
              <ArrowBackRoundedIcon />
            </IconButton>
            <Box minWidth={0}>
              <Typography variant="h6" noWrap>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="contained" onClick={(e) => onSubmit(e as any)} disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 2fr) minmax(360px, 1fr)",
          },
          minHeight: 0,
        }}
      >
        {/* Left: Form */}
        <Box
          sx={{
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            overflowY: "auto",
            p: 3,
          }}
        >
          <Stack spacing={3} component="form" onSubmit={onSubmit} noValidate>
            <Box>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Метаданные документа
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Проверьте и заполните данные на основе содержимого PDF справа.
              </Typography>

              <DocumentFormFields
                form={form}
                setForm={setForm}
                fileLabel={fileLabel}
                idPrefix={idPrefix}
                documentTypes={documentTypes}
              />
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack spacing={1}>
              <Button variant="contained" size="large" type="submit" fullWidth disabled={isSubmitting}>
                {submitLabel}
              </Button>
              {secondaryActions}
            </Stack>
          </Stack>
        </Box>

        {/* Right: PDF Reader */}
        <Box sx={{ bgcolor: "grey.100", minHeight: 0, minWidth: 0, position: "relative" }}>
          <Box
            component="iframe"
            src={pdfUrl}
            title="PDF Preview"
            sx={{
              width: "100%",
              height: "100%",
              border: 0,
              bgcolor: "common.white",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

const AdminDrawer: React.FC<AdminDrawerProps> = ({
  open,
  eyebrow,
  title,
  titleId,
  onClose,
  children,
}) => {
  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": titleId,
          sx: {
            width: { xs: "100%", sm: "min(560px, 100vw)" },
            height: "100dvh",
            p: 2.25,
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            gap: 1.5,
          },
        },
      }}
    >
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
            {eyebrow}
          </Typography>
          <Typography id={titleId} variant="h5">
            {title}
          </Typography>
        </Box>
        <Button type="button" variant="outlined" onClick={onClose}>
          Закрыть
        </Button>
      </Stack>
      <Box sx={{ overflowY: "auto", pr: 0.5 }}>{children}</Box>
    </Drawer>
  );
};

const AdminDocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  const [search, setSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFromFilter, setYearFromFilter] = useState("");
  const [yearToFilter, setYearToFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [sort, setSort] = useState("date_desc");

  const [moderationStatus, setModerationStatus] =
    useState<ModerationFilterValue>("pending");

  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(
    null
  );
  const [approvingSubmission, setApprovingSubmission] =
    useState<SubmissionItem | null>(null);

  const [createForm, setCreateForm] = useState<AdminForm>(() => createEmptyForm());
  const [editForm, setEditForm] = useState<AdminForm>(() => createEmptyForm());
  const [approveForm, setApproveForm] = useState<AdminForm>(() =>
    createEmptyForm()
  );

  const [createFormError, setCreateFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [approveFormError, setApproveFormError] = useState("");
  const [isApprovingSubmission, setIsApprovingSubmission] = useState(false);

  const rawTab = searchParams.get("tab");
  const activeTab: AdminTab = isAdminTab(rawTab) ? rawTab : "moderation";

  async function loadDocuments() {
    if (!token) {
      return;
    }

    const response = await getAdminDocuments(token, {
      q: search,
      type: documentTypeFilter,
      author: authorFilter,
      yearFrom: yearFromFilter,
      yearTo: yearToFilter,
      tags: tagsFilter,
      sort,
      pageSize: 20,
    });
    setPayload(response);
  }

  async function loadSubmissions() {
    if (!token) {
      return;
    }

    const response = await getAdminSubmissions(token);
    setSubmissions(response.items);
  }

  function resetEditing() {
    setEditingDocument(null);
    setEditForm(createEmptyForm());
    setEditFormError("");
  }

  function resetApproving() {
    setApprovingSubmission(null);
    setApproveForm(createEmptyForm());
    setApproveFormError("");
    setIsApprovingSubmission(false);
  }

  function closeDrawer() {
    resetApproving();
    resetEditing();
  }

  useEffect(() => {
    if (rawTab === activeTab) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, rawTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadSubmissions().catch(console.error);
    getDocumentTypes().then((res) => setDocumentTypes(res.items)).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadSubmissions().catch(console.error);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [authorFilter, documentTypeFilter, search, sort, tagsFilter, token, yearFromFilter, yearToFilter]);

  useEffect(() => {
    if (activeTab !== "moderation" && approvingSubmission) {
      resetApproving();
    }
    if (activeTab !== "catalog" && editingDocument) {
      resetEditing();
    }
  }, [activeTab]);

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

  const pendingSummary = useMemo(() => {
    const pending = submissions.filter((item) => item.status === "pending");
    return {
      total: pending.length,
    };
  }, [submissions]);

  const catalogSummary = useMemo(() => {
    return {};
  }, [payload]);

  const isDesktop = useMediaQuery("(min-width:960px)", {
    defaultMatches: true,
    noSsr: true,
  });

  const showModerationDrawer =
    activeTab === "moderation" && Boolean(approvingSubmission);
  const showCatalogDrawer = activeTab === "catalog" && Boolean(editingDocument);

  function switchTab(nextTab: AdminTab, preserveSelection = false) {
    if (!preserveSelection && nextTab !== activeTab) {
      closeDrawer();
    }

    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    setSearchParams(next);
  }

  function startEdit(item: DocumentItem) {
    setEditingDocument(item);
    setEditForm(createEditForm(item));
    setEditFormError("");
    switchTab("catalog", true);
  }

  function startApprove(item: SubmissionItem) {
    if (item.status !== "pending") {
      return;
    }

    setApprovingSubmission(item);
    setApproveForm(createApprovalForm(item));
    setApproveFormError("");
    switchTab("moderation", true);
  }

  async function handleCreateDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCreateFormError("");

    const missing = validateDocumentForm(createForm, true);
    if (missing.length > 0) {
      setCreateFormError(
        `Заполните обязательные поля: ${missing.join(", ")}.`
      );
      return;
    }

    try {
      await createDocument(token, buildDocumentFormData(createForm));
      await loadDocuments();
      setCreateForm(createEmptyForm());
    } catch (error) {
      setCreateFormError(
        resolveErrorMessage(error, "Не удалось создать документ.")
      );
    }
  }

  async function handleUpdateDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !editingDocument) {
      return;
    }

    setEditFormError("");

    const missing = validateDocumentForm(editForm, false);
    if (missing.length > 0) {
      setEditFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }

    try {
      await updateDocument(token, editingDocument.id, buildDocumentFormData(editForm));
      await loadDocuments();
      resetEditing();
    } catch (error) {
      setEditFormError(
        resolveErrorMessage(error, "Не удалось сохранить изменения.")
      );
    }
  }

  async function handleApproveSubmission(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !approvingSubmission || isApprovingSubmission) {
      return;
    }

    setApproveFormError("");

    const missing = validateDocumentForm(approveForm, false);
    if (missing.length > 0) {
      setApproveFormError(
        `Заполните обязательные поля: ${missing.join(", ")}.`
      );
      return;
    }

    try {
      setIsApprovingSubmission(true);
      await approveSubmission(
        token,
        approvingSubmission.id,
        buildDocumentFormData(approveForm)
      );
      await Promise.all([loadDocuments(), loadSubmissions()]);
      resetApproving();
    } catch (error) {
      setApproveFormError(
        resolveErrorMessage(error, "Не удалось одобрить заявку.")
      );
      setIsApprovingSubmission(false);
    }
  }

  async function removeDocument(id: number) {
    if (!token || !window.confirm("Удалить документ?")) {
      return;
    }

    await deleteDocument(token, id);
    if (editingDocument?.id === id) {
      resetEditing();
    }
    await loadDocuments();
  }

  async function handleRejectSubmission(item: SubmissionItem) {
    if (!token) {
      return;
    }

    const moderationNote = window.prompt(
      "Причина отклонения",
      item.moderationNote ?? ""
    );
    if (!moderationNote?.trim()) {
      return;
    }

    await rejectSubmission(token, item.id, moderationNote.trim());
    if (approvingSubmission?.id === item.id) {
      resetApproving();
    }
    await loadSubmissions();
  }



  return (
    <AdminFrame
      title="Управление документами"
      
      chips={[
        { label: `На модерации: ${pendingSummary.total}` },
        { label: `В каталоге: ${payload?.total ?? 0}` },
      ]}
    >
      <ContentCard sx={{ p: { xs: 1.2, md: 1.6 } }}>
        <Stack spacing={1.25}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "secondary.main",
                  fontWeight: 700,
                }}
              >
                Рабочие режимы
              </Typography>
              <Typography color="text.secondary">
                Выберите область работы: модерация, каталог или ручная загрузка.
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
              <Chip label={`В очереди: ${pendingSummary.total}`} />
            </Stack>
          </Stack>

          <Paper sx={{ borderRadius: 2.5, px: 1, py: 0.75 }}>
            <Tabs
              value={activeTab}
              onChange={(_, nextTab: AdminTab) => switchTab(nextTab)}
              aria-label="Режимы админки"
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {adminTabs.map((tab) => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={tab.label}
                  sx={{ mr: 0.75 }}
                />
              ))}
            </Tabs>
          </Paper>
        </Stack>
      </ContentCard>

      {activeTab === "moderation" && (
        <ContentCard>
          <Stack spacing={2}>
            <Stack>
              <Typography
                variant="caption"
                sx={eyebrowSx}
              >
                Модерация
              </Typography>
              <Typography component="h2" variant="h5">
                Очередь модерации
              </Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                gap: 1.25,
              }}
            >
              <Paper sx={{ p: 1.8, borderRadius: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  На модерации
                </Typography>
                <Typography variant="h4">{pendingSummary.total}</Typography>
              </Paper>
            </Box>

            <Paper sx={filterPanelSx}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Фильтры очереди
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                  <FormControl sx={{ minWidth: 240 }}>
                    <InputLabel id="moderation-status-label">Фильтр по статусу</InputLabel>
                    <Select
                      labelId="moderation-status-label"
                      aria-label="Фильтр по статусу"
                      value={moderationStatus}
                      label="Фильтр по статусу"
                      onChange={(event) =>
                        setModerationStatus(
                          (event.target.value as ModerationFilterValue) ?? ""
                        )
                      }
                    >
                      <MenuItem value="">Все статусы</MenuItem>
                      <MenuItem value="pending">На модерации</MenuItem>
                      <MenuItem value="approved">Одобрено</MenuItem>
                      <MenuItem value="rejected">Отклонено</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Paper>

            {isDesktop ? (
              <TableContainer component={Paper} sx={tableSurfaceSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Пользователь</TableCell>
                      
                      <TableCell>Статус</TableCell>
                      <TableCell>Создано</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSubmissions.map((item) => (
                      <TableRow
                        key={item.id}
                        selected={approvingSubmission?.id === item.id}
                        hover
                      >
                        <TableCell>{item.title}</TableCell>
                        <TableCell>
                          <Typography>{item.uploaderName || "Пользователь"}</Typography>
                          
                        </TableCell>
                        
                        <TableCell>
                          <Chip size="small" label={submissionStatusLabel(item.status)} sx={statusToneChipSx(submissionStatusTone(item.status))} />
                          {item.moderationNote && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                              {item.moderationNote}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                            <Tooltip title="Открыть PDF">
                              <IconButton
                                aria-label="Открыть PDF"
                                size="small"
                                component="a"
                                href={submissionFileUrl(
                                  item.id,
                                  token ?? "",
                                  false,
                                  item.updatedAt
                                )}
                                target="_blank"
                                rel="noreferrer"
                                sx={cardActionIconButtonSx}
                              >
                                <PictureAsPdfRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {item.status === "pending" && (
                              <>
                                <Tooltip title="Оформить">
                                  <IconButton
                                    aria-label="Оформить"
                                    size="small"
                                    type="button"
                                    onClick={() => startApprove(item)}
                                    sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}
                                  >
                                    <CheckCircleRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Отклонить">
                                  <IconButton
                                    aria-label="Отклонить"
                                    size="small"
                                    type="button"
                                    onClick={() => void handleRejectSubmission(item)}
                                    sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}
                                  >
                                    <RemoveCircleOutlineRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            {item.approvedDocumentId && (
                              <Tooltip title="Открыть документ">
                                <IconButton
                                  aria-label="Открыть документ"
                                  size="small"
                                  component={Link}
                                  to={`/documents/${item.approvedDocumentId}`}
                                  sx={cardActionIconButtonSx}
                                >
                                  <OpenInNewRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSubmissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography color="text.secondary">
                            По текущим фильтрам заявки не найдены.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Stack spacing={1}>
                {filteredSubmissions.map((item) => (
                  <Card key={item.id} sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ display: "grid", gap: 1 }}>
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                        <Typography fontWeight={700}>{item.title}</Typography>
                        <Chip
                          size="small"
                          label={submissionStatusLabel(item.status)}
                          sx={statusToneChipSx(submissionStatusTone(item.status))}
                        />
                      </Stack>

                      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                        <Chip size="small" label={formatDate(item.createdAt)} />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {(item.uploaderName || "Пользователь") +
                          (item.uploaderEmail ? ` • ${item.uploaderEmail}` : "")}
                      </Typography>

                      

                      {item.moderationNote && (
                        <Typography variant="body2" color="text.secondary">
                          Комментарий: {item.moderationNote}
                        </Typography>
                      )}
                    </CardContent>

                    <Divider />
                    <CardActions sx={{ px: 1.3, py: 0.95, justifyContent: "flex-end", gap: 0.6 }}>
                      <Tooltip title="Открыть PDF">
                        <IconButton
                          aria-label="Открыть PDF"
                          size="small"
                          component="a"
                          href={submissionFileUrl(
                            item.id,
                            token ?? "",
                            false,
                            item.updatedAt
                          )}
                          target="_blank"
                          rel="noreferrer"
                          sx={cardActionIconButtonSx}
                        >
                          <PictureAsPdfRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {item.status === "pending" && (
                        <>
                          <Tooltip title="Оформить">
                            <IconButton
                              aria-label="Оформить"
                              size="small"
                              type="button"
                              onClick={() => startApprove(item)}
                              sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}
                            >
                              <CheckCircleRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Отклонить">
                            <IconButton
                              aria-label="Отклонить"
                              size="small"
                              type="button"
                              onClick={() => void handleRejectSubmission(item)}
                              sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}
                            >
                              <RemoveCircleOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {item.approvedDocumentId && (
                        <Tooltip title="Открыть документ">
                          <IconButton
                            aria-label="Открыть документ"
                            size="small"
                            component={Link}
                            to={`/documents/${item.approvedDocumentId}`}
                            sx={cardActionIconButtonSx}
                          >
                            <OpenInNewRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                ))}
                {filteredSubmissions.length === 0 && (
                  <Paper sx={{ p: 2, borderRadius: 2.5 }}>
                    <Typography color="text.secondary">
                      По текущим фильтрам заявки не найдены.
                    </Typography>
                  </Paper>
                )}
              </Stack>
            )}
          </Stack>
        </ContentCard>
      )}

      {activeTab === "catalog" && (
        <ContentCard>
          <Stack spacing={2}>
            <Stack>
              <Typography
                variant="caption"
                sx={eyebrowSx}
              >
                Каталог
              </Typography>
              <Typography component="h2" variant="h5">
                Документы каталога
              </Typography>
            </Stack>

            <Paper sx={filterPanelSx}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Фильтры каталога
                </Typography>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} flexWrap="wrap" useFlexGap>
                  <TextField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск по названию"
                    sx={{ minWidth: { xs: "100%", lg: 260 } }}
                  />

                  <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id="catalog-type-label">Тип документа</InputLabel>
                    <Select
                      labelId="catalog-type-label"
                      value={documentTypeFilter}
                      label="Тип документа"
                      aria-label="Тип документа"
                      onChange={(event) => setDocumentTypeFilter(event.target.value)}
                    >
                      <MenuItem value="">Все типы</MenuItem>
                      {documentTypes.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    value={authorFilter}
                    onChange={(event) => setAuthorFilter(event.target.value)}
                    label="Автор"
                    placeholder="Введите автора"
                    inputProps={{ "aria-label": "Автор" }}
                    sx={{ minWidth: { xs: "100%", lg: 220 } }}
                  />

                  <TextField
                    value={yearFromFilter}
                    onChange={(event) => setYearFromFilter(event.target.value)}
                    label="Год с"
                    type="number"
                    inputProps={{ "aria-label": "Год с", min: 1900, max: 2100 }}
                    sx={{ width: { xs: "100%", lg: 130 } }}
                  />

                  <TextField
                    value={yearToFilter}
                    onChange={(event) => setYearToFilter(event.target.value)}
                    label="Год по"
                    type="number"
                    inputProps={{ "aria-label": "Год по", min: 1900, max: 2100 }}
                    sx={{ width: { xs: "100%", lg: 130 } }}
                  />

                  <TextField
                    value={tagsFilter}
                    onChange={(event) => setTagsFilter(event.target.value)}
                    label="Ключевые слова"
                    placeholder="Теги через пробел или запятую"
                    inputProps={{ "aria-label": "Ключевые слова" }}
                    sx={{ minWidth: { xs: "100%", lg: 240 } }}
                  />

                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id="catalog-sort-label">Сортировка документов</InputLabel>
                    <Select
                      labelId="catalog-sort-label"
                      value={sort}
                      label="Сортировка документов"
                      aria-label="Сортировка документов"
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <MenuItem value="date_desc">Новые</MenuItem>
                      <MenuItem value="date_asc">Старые</MenuItem>
                      <MenuItem value="title_asc">А-Я</MenuItem>
                      <MenuItem value="size_desc">Большой размер</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Paper>



            {isDesktop ? (
              <TableContainer component={Paper} sx={tableSurfaceSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Тип</TableCell>
                      
                      <TableCell>Год</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(payload?.items ?? []).map((item) => (
                      <TableRow key={item.id} selected={editingDocument?.id === item.id} hover>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        
                        <TableCell>{item.year}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                            <Tooltip title="Редактировать">
                              <IconButton
                                aria-label="Редактировать"
                                size="small"
                                type="button"
                                onClick={() => startEdit(item)}
                                sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                aria-label="Удалить"
                                size="small"
                                type="button"
                                onClick={() => void removeDocument(item.id)}
                                sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(payload?.items ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary">
                            Документы по текущим фильтрам не найдены.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Stack spacing={1}>
                {(payload?.items ?? []).map((item) => (
                  <Card key={item.id} sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ display: "grid", gap: 1 }}>
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                        <Typography fontWeight={700}>{item.title}</Typography>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {item.type} • {item.year}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        
                      </Typography>
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ px: 1.3, py: 0.95, justifyContent: "flex-end", gap: 0.6 }}>
                      <Tooltip title="Редактировать">
                        <IconButton
                          aria-label="Редактировать"
                          size="small"
                          type="button"
                          onClick={() => startEdit(item)}
                          sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton
                          aria-label="Удалить"
                          size="small"
                          type="button"
                          onClick={() => void removeDocument(item.id)}
                          sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                ))}
                {(payload?.items ?? []).length === 0 && (
                  <Paper sx={{ p: 2, borderRadius: 2.5 }}>
                    <Typography color="text.secondary">
                      Документы по текущим фильтрам не найдены.
                    </Typography>
                  </Paper>
                )}
              </Stack>
            )}
          </Stack>
        </ContentCard>
      )}

      {activeTab === "upload" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 2,
          }}
        >
          <ContentCard>
            <Stack spacing={1.5}>
              <Stack>
                <Typography
                  variant="caption"
                  sx={eyebrowSx}
                >
                  Загрузка
                </Typography>
                <Typography component="h2" variant="h5">
                  Добавить документ вручную
                </Typography>
              </Stack>

              <Typography color="text.secondary">
                Этот режим создаёт документ сразу в каталоге. Все поля со
                звёздочкой обязательны.
              </Typography>

              <Stack component="form" spacing={1.5} onSubmit={handleCreateDocument} noValidate>
                <DocumentFormFields
                  form={createForm}
                  setForm={setCreateForm}
                  documentTypes={documentTypes}
                  fileLabel="PDF-файл *"
                  idPrefix="admin-create"
                />

                {createFormError && <Alert severity="error">{createFormError}</Alert>}

                <Box>
                  <Button variant="contained" type="submit">
                    Создать документ
                  </Button>
                </Box>
              </Stack>
            </Stack>
          </ContentCard>
        </Box>
      )}

      <ModerationFullView
        open={showModerationDrawer && !!approvingSubmission}
        title="Одобрить заявку"
        subtitle={approvingSubmission?.title}
        pdfUrl={approvingSubmission ? submissionFileUrl(approvingSubmission.id, token ?? "", false, approvingSubmission.updatedAt) : ""}
        onClose={closeDrawer}
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
            variant="outlined"
            color="error"
            size="large"
            onClick={() => approvingSubmission && void handleRejectSubmission(approvingSubmission)}
          >
            Отклонить заявку
          </Button>
        }
      />

      <ModerationFullView
        open={showCatalogDrawer && !!editingDocument}
        title="Редактировать документ"
        subtitle={editingDocument?.title}
        pdfUrl={editingDocument ? documentFileUrl(editingDocument.id, token ?? "", false, editingDocument.updatedAt) : ""}
        onClose={closeDrawer}
        form={editForm}
        setForm={setEditForm}
        error={editFormError}
        onSubmit={handleUpdateDocument}
        submitLabel="Сохранить изменения"
        fileLabel="Заменить PDF (необязательно)"
        idPrefix="admin-edit"
        documentTypes={documentTypes}
        secondaryActions={
          <Button
            variant="outlined"
            color="error"
            size="large"
            onClick={() => editingDocument && void removeDocument(editingDocument.id)}
          >
            Удалить документ
          </Button>
        }
      />
    </AdminFrame>
  );
};

export default AdminDocumentsPage;
