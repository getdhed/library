import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardActions,
  CardContent,
  Button,
  Checkbox,
  Chip,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
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
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import {
  approveSubmission,
  createDocument,
  deleteDocument,
  getAdminDepartments,
  getAdminDocuments,
  getAdminFaculties,
  getAdminSubmissions,
  queueImportFolderSubmissions,
  rejectSubmission,
  submissionFileUrl,
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
  Department,
  DocumentItem,
  Faculty,
  ImportFolderResult,
  PagedDocuments,
  SubmissionItem,
  SubmissionSource,
  SubmissionStatus,
} from "../../types";

type AdminTab = "moderation" | "catalog" | "upload";
type ModerationFilterValue = SubmissionStatus | "";

type AdminForm = {
  title: string;
  author: string;
  year: number;
  type: string;
  description: string;
  facultyId: number;
  departmentId: number;
  tags: string;
  isVisible: boolean;
  file: File | null;
};

type DocumentFormFieldsProps = {
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  faculties: Faculty[];
  departments: Department[];
  fileLabel?: string;
  idPrefix: string;
};

type AdminDrawerProps = {
  open: boolean;
  eyebrow: string;
  title: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "moderation", label: "Модерация" },
  { id: "catalog", label: "Каталог" },
  { id: "upload", label: "Загрузка" },
];

function createEmptyForm(defaultType = "Учебник"): AdminForm {
  return {
    title: "",
    author: "",
    year: new Date().getFullYear(),
    type: defaultType,
    description: "",
    facultyId: 0,
    departmentId: 0,
    tags: "",
    isVisible: true,
    file: null,
  };
}

function createEditForm(item: DocumentItem): AdminForm {
  return {
    title: item.title,
    author: item.author,
    year: item.year,
    type: item.type,
    description: item.description,
    facultyId: item.facultyId,
    departmentId: item.departmentId,
    tags: item.tags.join(", "),
    isVisible: item.isVisible,
    file: null,
  };
}

function createApprovalForm(item: SubmissionItem): AdminForm {
  return {
    title: item.title,
    author: item.author ?? "",
    year: new Date().getFullYear(),
    type: "Методичка",
    description: "",
    facultyId: item.facultyId ?? 0,
    departmentId: item.departmentId ?? 0,
    tags: "",
    isVisible: true,
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

function submissionSourceLabel(source: SubmissionSource) {
  return source === "admin_import" ? "Import-папка" : "Пользователь";
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
  if (!form.author.trim()) {
    missing.push("автор");
  }
  if (!Number.isFinite(form.year) || form.year <= 0) {
    missing.push("год");
  }
  if (!form.type.trim()) {
    missing.push("тип");
  }
  if (!form.departmentId) {
    missing.push("кафедра");
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
  formData.set("year", String(form.year));
  formData.set("type", form.type.trim());
  formData.set("description", form.description.trim());
  formData.set("departmentId", String(form.departmentId));
  formData.set("tags", form.tags);
  formData.set("isVisible", String(form.isVisible));

  if (form.file) {
    formData.set("file", form.file);
  }

  return formData;
}

function getDepartmentsForFaculty(
  departments: Department[],
  facultyId: number
) {
  return departments.filter(
    (department) => !facultyId || department.facultyId === facultyId
  );
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

const DocumentFormFields: React.FC<DocumentFormFieldsProps> = ({
  form,
  setForm,
  faculties,
  departments,
  fileLabel,
  idPrefix,
}) => {
  return (
    <Stack spacing={1.4}>
      <TextField
        label="Название *"
        value={form.title}
        onChange={(event) =>
          setForm((current) => ({ ...current, title: event.target.value }))
        }
        placeholder="Название"
        required
        fullWidth
        inputProps={{ "aria-label": "Название *" }}
      />

      <TextField
        label="Автор *"
        value={form.author}
        onChange={(event) =>
          setForm((current) => ({ ...current, author: event.target.value }))
        }
        placeholder="Автор"
        required
        fullWidth
        inputProps={{ "aria-label": "Автор *" }}
      />

      <TextField
        label="Год *"
        value={String(form.year || "")}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            year: Number(event.target.value),
          }))
        }
        placeholder="Год"
        type="number"
        required
        fullWidth
        inputProps={{ "aria-label": "Год *" }}
      />

      <TextField
        label="Тип *"
        value={form.type}
        onChange={(event) =>
          setForm((current) => ({ ...current, type: event.target.value }))
        }
        placeholder="Тип"
        required
        fullWidth
        inputProps={{ "aria-label": "Тип *" }}
      />

      <TextField
        select
        label="Факультет"
        value={form.facultyId || ""}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            facultyId: Number(event.target.value) || 0,
            departmentId: 0,
          }))
        }
        fullWidth
        inputProps={{ "aria-label": "Факультет" }}
      >
        <MenuItem value="">Факультет</MenuItem>
        {faculties.map((faculty) => (
          <MenuItem key={faculty.id} value={faculty.id}>
            {faculty.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Кафедра *"
        value={form.departmentId || ""}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            departmentId: Number(event.target.value) || 0,
          }))
        }
        required
        fullWidth
        inputProps={{ "aria-label": "Кафедра *" }}
      >
        <MenuItem value="">Кафедра</MenuItem>
        {departments.map((department) => (
          <MenuItem key={department.id} value={department.id}>
            {department.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Теги"
        value={form.tags}
        onChange={(event) =>
          setForm((current) => ({ ...current, tags: event.target.value }))
        }
        placeholder="Теги через запятую"
        fullWidth
      />

      {fileLabel && (
        <Box sx={{ display: "grid", gap: 0.8 }}>
          <Typography fontWeight={600}>
            {fileLabel}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Button component="label" variant="outlined" type="button">
              {form.file ? "Заменить PDF" : "Выбрать PDF"}
              <Box
                component="input"
                type="file"
                aria-label={fileLabel}
                accept=".pdf,application/pdf"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] ?? null,
                  }))
                }
                sx={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  p: 0,
                  m: -1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {form.file ? form.file.name : "Файл не выбран"}
            </Typography>
          </Stack>
        </Box>
      )}

      <TextField
        label="Описание *"
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        placeholder="Описание"
        required
        multiline
        minRows={4}
        fullWidth
        inputProps={{ "aria-label": "Описание *" }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={form.isVisible}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isVisible: event.target.checked,
              }))
            }
          />
        }
        label="Документ видим пользователям"
      />
    </Stack>
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
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [visibility, setVisibility] = useState("");
  const [filterFacultyId, setFilterFacultyId] = useState(0);
  const [filterDepartmentId, setFilterDepartmentId] = useState(0);

  const [moderationSource, setModerationSource] = useState<SubmissionSource | "">(
    ""
  );
  const [moderationStatus, setModerationStatus] =
    useState<ModerationFilterValue>("pending");

  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(
    null
  );
  const [approvingSubmission, setApprovingSubmission] =
    useState<SubmissionItem | null>(null);

  const [createForm, setCreateForm] = useState<AdminForm>(() => createEmptyForm());
  const [editForm, setEditForm] = useState<AdminForm>(() => createEmptyForm());
  const [approveForm, setApproveForm] = useState<AdminForm>(() =>
    createEmptyForm("Методичка")
  );

  const [createFormError, setCreateFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [approveFormError, setApproveFormError] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<ImportFolderResult | null>(
    null
  );

  const rawTab = searchParams.get("tab");
  const activeTab: AdminTab = isAdminTab(rawTab) ? rawTab : "moderation";

  async function loadDocuments() {
    if (!token) {
      return;
    }

    const response = await getAdminDocuments(token, {
      q: search,
      sort,
      visibility,
      facultyId: filterFacultyId,
      departmentId: filterDepartmentId,
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
    setApproveForm(createEmptyForm("Методичка"));
    setApproveFormError("");
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

    getAdminFaculties(token)
      .then((response) => setFaculties(response.items))
      .catch(console.error);

    getAdminDepartments(token)
      .then((response) => setAllDepartments(response.items))
      .catch(console.error);

    loadSubmissions().catch(console.error);
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
  }, [filterDepartmentId, filterFacultyId, search, sort, token, visibility]);

  useEffect(() => {
    if (activeTab !== "moderation" && approvingSubmission) {
      resetApproving();
    }
    if (activeTab !== "catalog" && editingDocument) {
      resetEditing();
    }
  }, [activeTab]);

  const filterDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, filterFacultyId),
    [allDepartments, filterFacultyId]
  );

  const createDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, createForm.facultyId),
    [allDepartments, createForm.facultyId]
  );

  const editDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, editForm.facultyId),
    [allDepartments, editForm.facultyId]
  );

  const approveDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, approveForm.facultyId),
    [allDepartments, approveForm.facultyId]
  );

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((item) => {
        if (moderationSource && item.source !== moderationSource) {
          return false;
        }
        if (moderationStatus && item.status !== moderationStatus) {
          return false;
        }
        return true;
      }),
    [moderationSource, moderationStatus, submissions]
  );

  const pendingSummary = useMemo(() => {
    const pending = submissions.filter((item) => item.status === "pending");
    return {
      total: pending.length,
      importCount: pending.filter((item) => item.source === "admin_import")
        .length,
      userCount: pending.filter((item) => item.source === "user_upload").length,
    };
  }, [submissions]);

  const catalogSummary = useMemo(() => {
    const items = payload?.items ?? [];
    const visibleCount = items.filter((item) => item.isVisible).length;
    return {
      visibleCount,
      hiddenCount: items.length - visibleCount,
    };
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
    if (!token || !approvingSubmission) {
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

  async function handleImportFromFolder() {
    if (!token) {
      return;
    }

    setImportError("");
    setImportResult(null);

    try {
      const result = await queueImportFolderSubmissions(token);
      setImportResult(result);
      await loadSubmissions();
    } catch (error) {
      setImportError(
        resolveErrorMessage(error, "Не удалось проверить import-папку.")
      );
    }
  }

  return (
    <AdminFrame
      title="Управление документами"
      description="Каталог, очередь модерации и загрузка PDF собраны в единую рабочую панель."
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
              <Chip label={`Import: ${pendingSummary.importCount}`} />
              <Chip label={`Пользователи: ${pendingSummary.userCount}`} />
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
              <Paper sx={{ p: 1.8, borderRadius: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Из import-папки
                </Typography>
                <Typography variant="h4">{pendingSummary.importCount}</Typography>
              </Paper>
              <Paper sx={{ p: 1.8, borderRadius: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  От пользователей
                </Typography>
                <Typography variant="h4">{pendingSummary.userCount}</Typography>
              </Paper>
            </Box>

            <Paper sx={filterPanelSx}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Фильтры очереди
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                  <FormControl sx={{ minWidth: 240 }}>
                    <InputLabel id="moderation-source-label">Фильтр по источнику</InputLabel>
                    <Select
                      labelId="moderation-source-label"
                      aria-label="Фильтр по источнику"
                      value={moderationSource}
                      label="Фильтр по источнику"
                      onChange={(event) =>
                        setModerationSource(
                          (event.target.value as SubmissionSource | "") ?? ""
                        )
                      }
                    >
                      <MenuItem value="">Все источники</MenuItem>
                      <MenuItem value="user_upload">Пользователь</MenuItem>
                      <MenuItem value="admin_import">Import-папка</MenuItem>
                    </Select>
                  </FormControl>

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
                      <TableCell>Источник</TableCell>
                      <TableCell>Пользователь</TableCell>
                      <TableCell>Кафедра</TableCell>
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
                          <Chip
                            size="small"
                            label={submissionSourceLabel(item.source)}
                            sx={{
                              borderColor: "divider",
                              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                              color: "primary.dark",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography>{item.uploaderName || "Пользователь"}</Typography>
                          {item.uploaderEmail && (
                            <Typography variant="body2" color="text.secondary">
                              {item.uploaderEmail}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{item.department || "Не указана"}</TableCell>
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
                                    sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx]}
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
                                    sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx]}
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
                        <Chip
                          size="small"
                          label={submissionSourceLabel(item.source)}
                          sx={{
                            borderColor: "divider",
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            color: "primary.dark",
                          }}
                        />
                        <Chip size="small" label={formatDate(item.createdAt)} />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {(item.uploaderName || "Пользователь") +
                          (item.uploaderEmail ? ` • ${item.uploaderEmail}` : "")}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Кафедра: {item.department || "Не указана"}
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
                              sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx]}
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
                              sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx]}
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

                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="catalog-visibility-label">Видимость документов</InputLabel>
                    <Select
                      labelId="catalog-visibility-label"
                      value={visibility}
                      label="Видимость документов"
                      aria-label="Видимость документов"
                      onChange={(event) => setVisibility(event.target.value)}
                    >
                      <MenuItem value="">Вся видимость</MenuItem>
                      <MenuItem value="visible">Только видимые</MenuItem>
                      <MenuItem value="hidden">Только скрытые</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="catalog-faculty-filter-label">Фильтр по факультету</InputLabel>
                    <Select
                      labelId="catalog-faculty-filter-label"
                      value={filterFacultyId || ""}
                      label="Фильтр по факультету"
                      aria-label="Фильтр по факультету"
                      onChange={(event) => {
                        setFilterFacultyId(Number(event.target.value) || 0);
                        setFilterDepartmentId(0);
                      }}
                    >
                      <MenuItem value="">Все факультеты</MenuItem>
                      {faculties.map((faculty) => (
                        <MenuItem key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="catalog-department-filter-label">Фильтр по кафедре</InputLabel>
                    <Select
                      labelId="catalog-department-filter-label"
                      value={filterDepartmentId || ""}
                      label="Фильтр по кафедре"
                      aria-label="Фильтр по кафедре"
                      onChange={(event) =>
                        setFilterDepartmentId(Number(event.target.value) || 0)
                      }
                    >
                      <MenuItem value="">Все кафедры</MenuItem>
                      {filterDepartments.map((department) => (
                        <MenuItem key={department.id} value={department.id}>
                          {department.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Paper>

            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
              <Chip label={`Видимых: ${catalogSummary.visibleCount}`} />
              <Chip label={`Скрытых: ${catalogSummary.hiddenCount}`} />
            </Stack>

            {isDesktop ? (
              <TableContainer component={Paper} sx={tableSurfaceSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Тип</TableCell>
                      <TableCell>Кафедра</TableCell>
                      <TableCell>Год</TableCell>
                      <TableCell>Видимость</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(payload?.items ?? []).map((item) => (
                      <TableRow key={item.id} selected={editingDocument?.id === item.id} hover>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.department}</TableCell>
                        <TableCell>{item.year}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.isVisible ? "Видим" : "Скрыт"}
                            sx={statusToneChipSx(item.isVisible ? "success" : "danger")}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                            <Tooltip title="Редактировать">
                              <IconButton
                                aria-label="Редактировать"
                                size="small"
                                type="button"
                                onClick={() => startEdit(item)}
                                sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx]}
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
                                sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx]}
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
                        <Chip
                          size="small"
                          label={item.isVisible ? "Видим" : "Скрыт"}
                          sx={statusToneChipSx(item.isVisible ? "success" : "danger")}
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {item.type} • {item.year}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.department}
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
                          sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx]}
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
                          sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx]}
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
            gridTemplateColumns: { xs: "1fr", xl: "1.05fr 0.95fr" },
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
                  faculties={faculties}
                  departments={createDepartments}
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

          <ContentCard>
            <Stack spacing={1.5}>
              <Stack>
                <Typography
                  variant="caption"
                  sx={eyebrowSx}
                >
                  Import-папка
                </Typography>
                <Typography component="h2" variant="h5">
                  Папка автоматического импорта
                </Typography>
              </Stack>

              <Typography color="text.secondary">
                Кладите PDF в <code>backend/storage/import</code>. Новые файлы
                автоматически попадают в очередь модерации и не появляются в
                каталоге до одобрения.
              </Typography>
              <Typography color="text.secondary">
                Если нужно, можно запустить проверку папки вручную и сразу
                увидеть результат.
              </Typography>

              {importError && <Alert severity="error">{importError}</Alert>}

              {importResult && (
                <Paper sx={{ p: 1.8, borderRadius: 2.5 }}>
                  <Typography fontWeight={700}>
                    Добавлено в очередь: {importResult.queued}
                  </Typography>
                  {importResult.errors.length > 0 && (
                    <List dense disablePadding sx={{ mt: 1 }}>
                      {importResult.errors.map((item) => (
                        <ListItem key={`${item.fileName}-${item.error}`} disablePadding sx={{ py: 0.15 }}>
                          <ListItemText primary={`${item.fileName}: ${item.error}`} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              )}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  type="button"
                  onClick={() => void handleImportFromFolder()}
                >
                  Проверить папку сейчас
                </Button>
                <Button
                  variant="outlined"
                  type="button"
                  onClick={() => switchTab("moderation")}
                >
                  Перейти к модерации
                </Button>
              </Stack>
            </Stack>
          </ContentCard>
        </Box>
      )}

      {showModerationDrawer && approvingSubmission && (
        <AdminDrawer
          open={showModerationDrawer}
          eyebrow="Модерация"
          title="Одобрить заявку"
          titleId="admin-approve-drawer-title"
          onClose={closeDrawer}
        >
          <Stack spacing={1.5}>
            <Typography color="text.secondary">
              Заполните обязательные поля каталога. PDF уже загружен и будет
              привязан к документу после одобрения.
            </Typography>

            <Paper sx={{ p: 1.8, borderRadius: 2.5 }}>
              <Stack spacing={0.75}>
                <Typography fontWeight={700}>{approvingSubmission.title}</Typography>
                <Typography color="text.secondary">
                  Источник: {submissionSourceLabel(approvingSubmission.source)}
                </Typography>
                {approvingSubmission.department && (
                  <Typography variant="body2">
                    Предложенная кафедра: {approvingSubmission.department}
                  </Typography>
                )}
                {approvingSubmission.comment && (
                  <Typography variant="body2">{approvingSubmission.comment}</Typography>
                )}
                <Box sx={{ pt: 0.5 }}>
                  <Button
                    component="a"
                    variant="outlined"
                    href={submissionFileUrl(
                      approvingSubmission.id,
                      token ?? "",
                      false,
                      approvingSubmission.updatedAt
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть PDF заявки
                  </Button>
                </Box>
              </Stack>
            </Paper>

            <Stack component="form" spacing={1.5} onSubmit={handleApproveSubmission} noValidate>
              <DocumentFormFields
                form={approveForm}
                setForm={setApproveForm}
                faculties={faculties}
                departments={approveDepartments}
                idPrefix="admin-approve"
              />

              {approveFormError && <Alert severity="error">{approveFormError}</Alert>}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" type="submit">
                  Одобрить заявку
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  type="button"
                  onClick={() => void handleRejectSubmission(approvingSubmission)}
                >
                  Отклонить
                </Button>
                <Button variant="outlined" type="button" onClick={closeDrawer}>
                  Отменить
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </AdminDrawer>
      )}

      {showCatalogDrawer && editingDocument && (
        <AdminDrawer
          open={showCatalogDrawer}
          eyebrow="Каталог"
          title="Редактировать документ"
          titleId="admin-edit-drawer-title"
          onClose={closeDrawer}
        >
          <Stack spacing={1.5}>
            <Typography color="text.secondary">
              Меняйте метаданные здесь. Новый PDF добавляйте только если нужно
              заменить файл документа.
            </Typography>

            <Stack component="form" spacing={1.5} onSubmit={handleUpdateDocument} noValidate>
              <DocumentFormFields
                form={editForm}
                setForm={setEditForm}
                faculties={faculties}
                departments={editDepartments}
                fileLabel="Новый PDF"
                idPrefix="admin-edit"
              />

              {editFormError && <Alert severity="error">{editFormError}</Alert>}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" type="submit">
                  Сохранить
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  type="button"
                  onClick={() => void removeDocument(editingDocument.id)}
                >
                  Удалить
                </Button>
                <Button variant="outlined" type="button" onClick={closeDrawer}>
                  Отменить
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </AdminDrawer>
      )}
    </AdminFrame>
  );
};

export default AdminDocumentsPage;
