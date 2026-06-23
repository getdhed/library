import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  type AdminForm,
  createEmptyForm,
} from "../../components/DocumentFormFields";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import {
  createDocument,
  deleteDocument,
  getAdminDocuments,
  getAdminStats,
  getDocumentTypes,
  documentFileUrl,
  updateDocument,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import { AdminDocumentFullView } from "../../components/AdminDocumentFullView";
import {
  cardActionIconButtonDangerSx,
  cardActionIconButtonPrimarySx,
  cardActionIconButtonSx,
  ContentCard,
  eyebrowSx,
  filterPanelSx,
  tableSurfaceSx,
} from "../../components/mui-primitives";
import type {
  AdminStats,
  DocumentItem,
  PagedDocuments,
} from "../../types";

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
    isLocal: item.isLocal ?? true,
    file: null,
  };
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
  if (!Number.isFinite(form.year) || form.year <= 0) missing.push("год");
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

  if (form.file) {
    formData.set("file", form.file);
  }

  return formData;
}

const AdminDocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [search, setSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFromFilter, setYearFromFilter] = useState("");
  const [yearToFilter, setYearToFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);

  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [editForm, setEditForm] = useState<AdminForm>(() => createEmptyForm());
  const [editFormError, setEditFormError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<AdminForm>(() => createEmptyForm());
  const [createFormError, setCreateFormError] = useState("");
  const [isSavingCreate, setIsSavingCreate] = useState(false);

  const [createPreviewUrl, setCreatePreviewUrl] = useState("");
  useEffect(() => {
    if (createForm.file) {
      const blob = new Blob([createForm.file], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setCreatePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCreatePreviewUrl("");
    }
  }, [createForm.file]);

  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  useEffect(() => {
    if (editForm.file) {
      const blob = new Blob([editForm.file], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setEditPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setEditPreviewUrl("");
    }
  }, [editForm.file]);

  const isDesktop = useMediaQuery("(min-width:960px)", {
    defaultMatches: true,
    noSsr: true,
  });

  async function loadDocuments() {
    if (!token) return;
    const response = await getAdminDocuments(token, {
      q: search,
      type: documentTypeFilter,
      author: authorFilter,
      yearFrom: yearFromFilter,
      yearTo: yearToFilter,
      tags: tagsFilter,
      sort,
      page,
      pageSize: 20,
    });
    setPayload(response);
  }

  useEffect(() => {
    if (!token) return;
    getDocumentTypes().then((res) => setDocumentTypes(res.items)).catch(console.error);
    getAdminStats(token).then((res) => setStats(res)).catch(console.error);
  }, [token]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [authorFilter, documentTypeFilter, search, sort, tagsFilter, token, yearFromFilter, yearToFilter, page]);

  function resetEditing() {
    setEditingDocument(null);
    setEditForm(createEmptyForm());
    setEditFormError("");
  }

  function startEdit(item: DocumentItem) {
    setEditingDocument(item);
    setEditForm(createEditForm(item));
    setEditFormError("");
  }

  function resetCreating() {
    setIsCreating(false);
    setCreateForm(createEmptyForm());
    setCreateFormError("");
  }

  function startCreate() {
    setIsCreating(true);
    setCreateForm(createEmptyForm());
    setCreateFormError("");
  }

  async function handleUpdateDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !editingDocument) return;
    if (isSavingEdit) return;

    setEditFormError("");
    const missing = validateDocumentForm(editForm, false);
    if (missing.length > 0) {
      setEditFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }

    try {
      setIsSavingEdit(true);
      await updateDocument(token, editingDocument.id, buildDocumentFormData(editForm));
      await loadDocuments();
      resetEditing();
    } catch (error) {
      setEditFormError(resolveErrorMessage(error, "Не удалось сохранить изменения."));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleCreateDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (isSavingCreate) return;

    setCreateFormError("");
    const missing = validateDocumentForm(createForm, true);
    if (missing.length > 0) {
      setCreateFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }

    try {
      setIsSavingCreate(true);
      await createDocument(token, buildDocumentFormData(createForm));
      await loadDocuments();
      resetCreating();
    } catch (error) {
      setCreateFormError(resolveErrorMessage(error, "Не удалось создать документ."));
    } finally {
      setIsSavingCreate(false);
    }
  }

  async function removeDocument(id: number) {
    if (!token || !window.confirm("Поместить документ в архив?")) return;
    await deleteDocument(token, id);
    if (editingDocument?.id === id) {
      resetEditing();
    }
    await loadDocuments();
  }

  return (
    <AdminFrame title="Управление документами">
      <Box sx={{ display: "flex", gap: { xs: 3, md: 5 }, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" }, mt: 2 }}>
        
        <Box
          sx={{
            width: { xs: "100%", md: "33.333%" },
            minWidth: { md: 320 },
            maxWidth: { md: 400 },
            position: { md: "sticky" },
            top: { md: 90 },
            maxHeight: { md: "calc(100vh - 110px)" },
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            flexShrink: 0,
            bgcolor: "action.hover",
            p: 3,
            borderRadius: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Каталог <Typography component="span" variant="h6" color="text.secondary">({payload?.total ?? 0})</Typography>
            </Typography>
            {stats && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Локальных: <b>{stats.localDocumentsCount}</b>, Внешних: <b>{stats.externalDocumentsCount}</b>
              </Typography>
            )}
          </Box>

          <Button variant="contained" size="large" onClick={startCreate} fullWidth>
            Добавить новый
          </Button>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
            <Stack spacing={2}>
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по названию"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="catalog-type-label">Тип документа</InputLabel>
                <Select
                  labelId="catalog-type-label"
                  value={documentTypeFilter}
                  label="Тип документа"
                  onChange={(event) => setDocumentTypeFilter(event.target.value)}
                >
                  <MenuItem value="">Все типы</MenuItem>
                  {documentTypes.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                value={authorFilter}
                onChange={(event) => setAuthorFilter(event.target.value)}
                label="Автор"
                placeholder="Введите автора"
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  value={yearFromFilter}
                  onChange={(event) => setYearFromFilter(event.target.value)}
                  label="Год с"
                  type="number"
                  fullWidth
                />
                <TextField
                  value={yearToFilter}
                  onChange={(event) => setYearToFilter(event.target.value)}
                  label="Год по"
                  type="number"
                  fullWidth
                />
              </Stack>
              <TextField
                value={tagsFilter}
                onChange={(event) => setTagsFilter(event.target.value)}
                label="Ключевые слова"
                placeholder="Теги через пробел"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="catalog-sort-label">Сортировка</InputLabel>
                <Select
                  labelId="catalog-sort-label"
                  value={sort}
                  label="Сортировка"
                  onChange={(event) => setSort(event.target.value)}
                >
                  <MenuItem value="date_desc">Новые</MenuItem>
                  <MenuItem value="date_asc">Старые</MenuItem>
                  <MenuItem value="title_asc">А-Я</MenuItem>
                  <MenuItem value="size_desc">Большой размер</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>
        </Box>

        <Stack spacing={3} sx={{ flexGrow: 1, minWidth: 0 }}>
          <ContentCard>
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
                              <IconButton size="small" onClick={() => startEdit(item)} sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}>
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="В архив">
                              <IconButton size="small" onClick={() => void removeDocument(item.id)} sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}>
                                <ArchiveOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(payload?.items ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary">Документы не найдены.</Typography>
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
                      <Typography fontWeight={700}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.type} • {item.year}</Typography>
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ px: 1.3, py: 0.95, justifyContent: "flex-end", gap: 0.6 }}>
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => startEdit(item)} sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="В архив">
                        <IconButton size="small" onClick={() => void removeDocument(item.id)} sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}>
                          <ArchiveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                ))}
                {(payload?.items ?? []).length === 0 && (
                  <Paper sx={{ p: 2, borderRadius: 2.5 }}>
                    <Typography color="text.secondary">Документы не найдены.</Typography>
                  </Paper>
                )}
              </Stack>
            )}

            {payload && payload.total > 20 && (
              <TablePagination
                component="div"
                count={payload.total}
                page={page - 1}
                onPageChange={(_, newPage) => {
                  setPage(newPage + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                rowsPerPage={20}
                rowsPerPageOptions={[20]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
              />
            )}
          </ContentCard>
        </Stack>
      </Box>

      <AdminDocumentFullView
        open={isCreating}
        title="Создать документ"
        pdfUrl={createPreviewUrl}
        onClose={resetCreating}
        form={createForm}
        setForm={setCreateForm}
        error={createFormError}
        onSubmit={handleCreateDocument}
        submitLabel="Создать"
        isSubmitting={isSavingCreate}
        fileLabel="PDF-файл *"
        idPrefix="admin-create"
        documentTypes={documentTypes}
      />

      <AdminDocumentFullView
        open={!!editingDocument}
        title="Редактировать документ"
        subtitle={editingDocument?.title}
        pdfUrl={editPreviewUrl || (editingDocument ? documentFileUrl(editingDocument.id, token ?? "", false, editingDocument.updatedAt) : "")}
        onClose={resetEditing}
        form={editForm}
        setForm={setEditForm}
        error={editFormError}
        onSubmit={handleUpdateDocument}
        submitLabel="Сохранить изменения"
        isSubmitting={isSavingEdit}
        fileLabel="Заменить PDF (необязательно)"
        idPrefix="admin-edit"
        documentTypes={documentTypes}
        secondaryActions={
          <Button
            variant="contained"
            color="error"
            onClick={() => editingDocument && void removeDocument(editingDocument.id)}
          >
            Архивировать документ
          </Button>
        }
      />
    </AdminFrame>
  );
};

export default AdminDocumentsPage;
