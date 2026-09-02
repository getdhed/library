import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import {
  VisibilityRounded as VisibilityRoundedIcon,
  VisibilityOffRounded as VisibilityOffRoundedIcon,
} from "@mui/icons-material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import {
  adminCreateDocumentType,
  adminDeleteDocumentType,
  adminGetDocumentTypes,
  adminUpdateDocumentType,
  adminToggleDocumentTypeVisibility,
  adminGetLanguages,
  adminCreateLanguage,
  adminUpdateLanguage,
  adminDeleteLanguage,
  adminToggleLanguageVisibility,
  adminUploadBackground,
  getBackgroundUrl,
  refreshBackgroundCache,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import type { DocumentTypeItem, LanguageItem } from "../../types";
import AdminFrame from "../../components/AdminFrame";
import {
  cardActionIconButtonDangerSx,
  cardActionIconButtonPrimarySx,
  cardActionIconButtonSx,
  tableSurfaceSx,
} from "../../components/mui-primitives";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

function DocumentTypesTab() {
  const { token } = useAuth();

  const [items, setItems] = useState<DocumentTypeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(0);
  const limit = 50;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentTypeItem | null>(null);
  const [typeName, setTypeName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<DocumentTypeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItems = () => {
    if (!token) return;
    setError("");
    adminGetDocumentTypes(token, page + 1, limit)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => setError(err.message || "Ошибка загрузки типов документов"));
  };

  useEffect(() => {
    loadItems();
  }, [token, page, limit]);

  const handleOpenAdd = () => {
    setEditingType(null);
    setTypeName("");
    setSaveError("");
    setEditDialogOpen(true);
  };

  const handleOpenEdit = (item: DocumentTypeItem) => {
    setEditingType(item);
    setTypeName(item.name);
    setSaveError("");
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (item: DocumentTypeItem) => {
    setDeletingType(item);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!typeName.trim() || !token) return;
    setIsSaving(true);
    setSaveError("");

    const req = editingType
      ? adminUpdateDocumentType(token, editingType.id, typeName)
      : adminCreateDocumentType(token, typeName);

    req
      .then(() => {
        setEditDialogOpen(false);
        setEditingType(null);
        setTypeName("");
        loadItems();
      })
      .catch((err) => setSaveError(err.message))
      .finally(() => setIsSaving(false));
  };

  const handleDelete = () => {
    if (!deletingType || !token) return;
    setIsDeleting(true);
    setError("");
    adminDeleteDocumentType(token, deletingType.id)
      .then(() => {
        setDeleteDialogOpen(false);
        setDeletingType(null);
        loadItems();
      })
      .catch((err) => setError("Ошибка удаления: " + err.message))
      .finally(() => setIsDeleting(false));
  };
  
  const handleToggleVisibility = (item: DocumentTypeItem) => {
    if (!token) return;
    setError("");
    adminToggleDocumentTypeVisibility(token, item.id, !item.isHidden)
      .then(() => loadItems())
      .catch((err) => setError("Ошибка изменения видимости: " + err.message));
  };

  const filteredItems = items.filter(item => {
    if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter === "active" && item.isHidden) return false;
    if (statusFilter === "hidden" && !item.isHidden) return false;
    return true;
  });

  return (
    <Box sx={{ display: "flex", gap: { xs: 3, md: 5 }, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" }, mt: 2 }}>
      <Box
        sx={{
          width: { xs: "100%", md: "33.333%" },
          minWidth: { md: 320 },
          maxWidth: { md: 400 },
          position: { md: "sticky" },
          top: { md: 24 },
          maxHeight: { md: "calc(100vh - 48px)" },
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
            Типы документов <Typography component="span" variant="h6" color="text.secondary">({total})</Typography>
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenAdd}
          fullWidth
        >
          Добавить тип
        </Button>

        <Divider />

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
          <Stack spacing={2}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="types-status-filter-label">Статус</InputLabel>
              <Select
                labelId="types-status-filter-label"
                value={statusFilter}
                label="Статус"
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value="active">Активные</MenuItem>
                <MenuItem value="hidden">Скрытые</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setQuery("");
                setStatusFilter("");
              }}
              disabled={!query && !statusFilter}
            >
              Сбросить
            </Button>
          </Stack>
        </Box>
      </Box>

      <Stack spacing={3} sx={{ flexGrow: 1, minWidth: 0 }}>
        {error && <Alert severity="error">{error}</Alert>}
      
        <TableContainer component={Paper} sx={tableSurfaceSx}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width={80}>ID</TableCell>
                <TableCell>Название типа</TableCell>
                <TableCell width={120}>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    <Typography fontWeight={500} color={item.isHidden ? "text.disabled" : "text.primary"}>
                      {item.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.isHidden ? (
                      <Typography variant="body2" color="text.disabled">Скрыт</Typography>
                    ) : (
                      <Typography variant="body2" color="success.main">Активен</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={0.5}>
                      <Tooltip title={item.isHidden ? "Показать" : "Скрыть"}>
                        <span>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleToggleVisibility(item)}
                            sx={cardActionIconButtonSx as any}
                          >
                            {item.isHidden ? (
                              <VisibilityRoundedIcon fontSize="small" />
                            ) : (
                              <VisibilityOffRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(item)}
                            sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx] as any}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDelete(item)}
                            sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx] as any}
                          >
                            <DeleteForeverRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      По текущим фильтрам типы не найдены.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > limit && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={limit}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPageOptions={[]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
            sx={{
              ".MuiTablePagination-toolbar": { minHeight: 48 },
            }}
          />
        )}
      </Stack>

      {/* Модалка редактирования / добавления */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingType ? "Редактировать тип" : "Добавить новый тип"}</DialogTitle>
        <DialogContent>
          {editingType && (
            <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
              Изменение названия автоматически обновит его во всех привязанных документах.
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Название типа документа"
            type="text"
            fullWidth
            variant="outlined"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            disabled={isSaving}
            inputProps={{ maxLength: 40 }}
            error={!!saveError}
            helperText={saveError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSaving}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!typeName.trim() || isSaving}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка удаления */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить тип "{deletingType?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить этот тип документа?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            Все документы, использующие этот тип, получат тип "Другое". Это действие нельзя отменить.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function LanguagesTab() {
  const { token } = useAuth();

  const [items, setItems] = useState<LanguageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(0);
  const limit = 50;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<LanguageItem | null>(null);
  const [languageName, setLanguageName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLanguage, setDeletingLanguage] = useState<LanguageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItems = () => {
    if (!token) return;
    setError("");
    adminGetLanguages(token, page + 1, limit)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => setError(err.message || "Ошибка загрузки языков документов"));
  };

  useEffect(() => {
    loadItems();
  }, [token, page, limit]);

  const handleOpenAdd = () => {
    setEditingLanguage(null);
    setLanguageName("");
    setSaveError("");
    setEditDialogOpen(true);
  };

  const handleOpenEdit = (item: LanguageItem) => {
    setEditingLanguage(item);
    setLanguageName(item.name);
    setSaveError("");
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (item: LanguageItem) => {
    setDeletingLanguage(item);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!languageName.trim() || !token) return;
    setIsSaving(true);

    const req = editingLanguage
      ? adminUpdateLanguage(token, editingLanguage.id, languageName)
      : adminCreateLanguage(token, languageName);

    setSaveError("");

    req
      .then(() => {
        setEditDialogOpen(false);
        setEditingLanguage(null);
        setLanguageName("");
        loadItems();
      })
      .catch((err) => setSaveError(err.message))
      .finally(() => setIsSaving(false));
  };

  const handleDelete = () => {
    if (!deletingLanguage || !token) return;
    setIsDeleting(true);
    setError("");
    adminDeleteLanguage(token, deletingLanguage.id)
      .then(() => {
        setDeleteDialogOpen(false);
        setDeletingLanguage(null);
        loadItems();
      })
      .catch((err) => setError("Ошибка удаления: " + err.message))
      .finally(() => setIsDeleting(false));
  };
  
  const handleToggleVisibility = (item: LanguageItem) => {
    if (!token) return;
    setError("");
    adminToggleLanguageVisibility(token, item.id, !item.isHidden)
      .then(() => loadItems())
      .catch((err) => setError("Ошибка изменения видимости: " + err.message));
  };

  const filteredItems = items.filter(item => {
    if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter === "active" && item.isHidden) return false;
    if (statusFilter === "hidden" && !item.isHidden) return false;
    return true;
  });

  return (
    <Box sx={{ display: "flex", gap: { xs: 3, md: 5 }, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" }, mt: 2 }}>
      <Box
        sx={{
          width: { xs: "100%", md: "33.333%" },
          minWidth: { md: 320 },
          maxWidth: { md: 400 },
          position: { md: "sticky" },
          top: { md: 24 },
          maxHeight: { md: "calc(100vh - 48px)" },
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
            Языки <Typography component="span" variant="h6" color="text.secondary">({total})</Typography>
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenAdd}
          fullWidth
        >
          Добавить язык
        </Button>

        <Divider />

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
          <Stack spacing={2}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="languages-status-filter-label">Статус</InputLabel>
              <Select
                labelId="languages-status-filter-label"
                value={statusFilter}
                label="Статус"
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value="active">Активные</MenuItem>
                <MenuItem value="hidden">Скрытые</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setQuery("");
                setStatusFilter("");
              }}
              disabled={!query && !statusFilter}
            >
              Сбросить
            </Button>
          </Stack>
        </Box>
      </Box>

      <Stack spacing={3} sx={{ flexGrow: 1, minWidth: 0 }}>
        {error && <Alert severity="error">{error}</Alert>}
      
        <TableContainer component={Paper} sx={tableSurfaceSx}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width={80}>ID</TableCell>
                <TableCell>Название языка</TableCell>
                <TableCell width={120}>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    <Typography fontWeight={500} color={item.isHidden ? "text.disabled" : "text.primary"}>
                      {item.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.isHidden ? (
                      <Typography variant="body2" color="text.disabled">Скрыт</Typography>
                    ) : (
                      <Typography variant="body2" color="success.main">Активен</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={0.5}>
                      <Tooltip title={item.isHidden ? "Показать" : "Скрыть"}>
                        <span>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleToggleVisibility(item)}
                            sx={cardActionIconButtonSx as any}
                          >
                            {item.isHidden ? (
                              <VisibilityRoundedIcon fontSize="small" />
                            ) : (
                              <VisibilityOffRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(item)}
                            sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx] as any}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDelete(item)}
                            sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx] as any}
                          >
                            <DeleteForeverRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      По текущим фильтрам языки не найдены.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > limit && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={limit}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPageOptions={[]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
            sx={{
              ".MuiTablePagination-toolbar": { minHeight: 48 },
            }}
          />
        )}
      </Stack>

      {/* Модалка редактирования / добавления */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingLanguage ? "Редактировать язык" : "Добавить новый язык"}</DialogTitle>
        <DialogContent>
          {editingLanguage && (
            <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
              Изменение названия автоматически обновит его во всех привязанных документах.
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Название языка документа"
            type="text"
            fullWidth
            variant="outlined"
            value={languageName}
            onChange={(e) => setLanguageName(e.target.value)}
            disabled={isSaving}
            inputProps={{ maxLength: 20 }}
            error={!!saveError}
            helperText={saveError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSaving}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!languageName.trim() || isSaving}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка удаления */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить язык "{deletingLanguage?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить этот язык документа?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            Все переводы на этом языке будут удалены из документов и заявок. Это действие нельзя отменить.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const getBgStyles = (bgUrl: string) => ({
  borderRadius: 2,
  overflow: "hidden",
  position: "relative",
  bgcolor: "primary.dark",
  backgroundImage: `url(${bgUrl}), url('/auth-bg.png?v=2'), linear-gradient(rgba(154,171,130,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(154,171,130,0.08) 1px, transparent 1px)`,
  backgroundSize: "cover, cover, 42px 42px, 42px 42px",
  backgroundPosition: "center, center, 0 0, 0 0",
  border: (theme: any) => `1px solid ${theme.palette.divider}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const);



function AppearanceTab() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [key, setKey] = useState(Date.now());

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFile = e.target.files[0];
      setFile(newFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(newFile));
      setError("");
      setSuccess("");
    }
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setIsUploading(true);
    setError("");
    setSuccess("");
    try {
      await adminUploadBackground(token, file);
      refreshBackgroundCache();
      setSuccess("Фон успешно обновлён");
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setKey(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки фона");
    } finally {
      setIsUploading(false);
    }
  };

  const currentBgUrl = previewUrl || `${getBackgroundUrl()}?t=${key}`;
  const previewLabel = file ? "Предпросмотр нового фона" : "Текущий фон";

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 4,
        alignItems: "flex-start",
      }}
    >
      {/* Left column: Controls */}
      <Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Фон сайта
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Изображение отображается на странице входа.
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            component="label"
            size="small"
            startIcon={<CloudUploadRoundedIcon />}
          >
            {file ? "Заменить файл" : "Выбрать файл"}
            <input
              type="file"
              hidden
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
            />
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Загрузка…" : "Сохранить"}
          </Button>
          {file && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              disabled={isUploading}
              onClick={() => {
                setFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
            >
              Сбросить
            </Button>
          )}
        </Stack>
      </Box>

      {/* Right column: Preview */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
            Страница входа
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {previewLabel} · 1920×1080 (JPG / PNG)
          </Typography>
        </Box>
        <Paper
          sx={{
            width: "100%",
            aspectRatio: "16/9",
            ...getBgStyles(currentBgUrl),
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 0,
            },
          }}
        >
          {/* Mini login form mock */}
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              width: "30%",
              minWidth: 140,
              maxWidth: 180,
              p: 2,
              borderRadius: 1,
              backgroundColor: "rgba(20, 20, 20, 0.65)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
            }}
          >
            <Stack alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
                <Box component="img" src="/ips-logo.png" sx={{ height: 20, objectFit: "contain" }} />
                <Typography sx={{ fontSize: 7, fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.1, color: "rgba(255,255,255,0.9)", letterSpacing: 0.2 }}>
                  Институт<br />пограничной<br />службы
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, fontWeight: "bold" }}>Вход</Typography>
            </Stack>
            
            <Stack spacing={0.8}>
              {/* Логин Input */}
              <Box sx={{ 
                width: "100%", 
                height: 26, 
                bgcolor: "rgba(255,255,255,0.06)", 
                border: "1px solid rgba(255,255,255,0.23)", 
                borderRadius: 0, 
                display: "flex", 
                alignItems: "center", 
                px: 1 
              }}>
                <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>Логин</Typography>
              </Box>
              
              {/* Пароль Input */}
              <Box sx={{ 
                width: "100%", 
                height: 26, 
                bgcolor: "rgba(255,255,255,0.06)", 
                border: "1px solid rgba(255,255,255,0.23)", 
                borderRadius: 0, 
                display: "flex", 
                alignItems: "center", 
                px: 1 
              }}>
                <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>Пароль</Typography>
              </Box>

              {/* Войти Button */}
              <Box sx={{ 
                width: "100%", 
                height: 28, 
                bgcolor: "white", 
                borderRadius: 0, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                mt: 0.5 
              }}>
                <Typography sx={{ fontSize: 10, color: "black", fontWeight: 600 }}>Войти</Typography>
              </Box>

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: 7, color: "rgba(255,255,255,0.7)", lineHeight: 1.1 }}>
                  Нет аккаунта? Зарегистрироваться
                </Typography>
                <HelpOutlineIcon sx={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }} />
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={(_, reason) => { if (reason !== 'clickaway') setError(""); }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert 
          onClose={() => setError("")} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={(_, reason) => { if (reason !== 'clickaway') setSuccess(""); }} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert 
          onClose={() => setSuccess("")} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function AdminSettingsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const { user } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <AdminFrame title="Настройки">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="admin settings tabs">
          <Tab label="Типы документов" {...a11yProps(0)} />
          <Tab label="Языки" {...a11yProps(1)} />
          {user?.role === "superadmin" && (
            <Tab label="Оформление" {...a11yProps(2)} />
          )}
        </Tabs>
      </Box>
      <CustomTabPanel value={tabIndex} index={0}>
        <DocumentTypesTab />
      </CustomTabPanel>
            <CustomTabPanel value={tabIndex} index={1}>
        <LanguagesTab />
      </CustomTabPanel>
      {user?.role === "superadmin" && (
        <CustomTabPanel value={tabIndex} index={2}>
          <AppearanceTab />
        </CustomTabPanel>
      )}
    </AdminFrame>
  );
}
