import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
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
  IconButton,
  Typography,
} from "@mui/material";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import {
  createAdminUser,
  getAdminUsers,
  setAdminUserStatus,
  updateAdminUser,
  hardDeleteAdminUser,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminFrame from "../../components/AdminFrame";
import {
  cardActionIconButtonDangerSx,
  cardActionIconButtonPrimarySx,
  cardActionIconButtonSx,
  statusToneChipSx,
  tableSurfaceSx,
} from "../../components/mui-primitives";
import type { User } from "../../types";

type UserForm = {
  username: string;
  fullName: string;
  role: User["role"];
  password: string;
};

function createEmptyForm(): UserForm {
  return {
    username: "",
    fullName: "",
    role: "user",
    password: "",
  };
}

function createEditForm(user: User): UserForm {
  return {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    password: "",
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const AdminUsersPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [items, setItems] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(() => createEmptyForm());
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ fullName: string; username: string; password: string }>({ fullName: "", username: "", password: "" });
  const [isSaving, setIsSaving] = useState(false);

  async function loadUsers() {
    if (!token) return;

    const response = await getAdminUsers(token, {
      q: query,
      role,
      status,
      page: page + 1,
      pageSize: 50,
    });
    setItems(response.items);
    setTotal(response.total);
  }

  useEffect(() => {
    setPage(0);
  }, [query, role, status]);

  useEffect(() => {
    loadUsers().catch(console.error);
  }, [token, query, role, status, page]);

  function handleOpenCreate() {
    setEditingUser(null);
    setForm(createEmptyForm());
    setError("");
    setTemporaryPassword("");
    setFieldErrors({ fullName: "", username: "", password: "" });
    setIsModalOpen(true);
  }

  function handleOpenEdit(user: User) {
    setEditingUser(user);
    setForm(createEditForm(user));
    setError("");
    setTemporaryPassword("");
    setFieldErrors({ fullName: "", username: "", password: "" });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (isSaving) return;

    setError("");
    const errs = { fullName: "", username: "", password: "" };
    let hasError = false;
    if (!form.fullName.trim()) {
      errs.fullName = "Укажите ФИО";
      hasError = true;
    }
    if (!form.username.trim()) {
      errs.username = "Укажите логин";
      hasError = true;
    }
    if (!editingUser) {
      const pw = form.password.trim();
      if (!pw) {
        errs.password = "Укажите пароль";
        hasError = true;
      } else if (pw.length < 6) {
        errs.password = "Пароль должен содержать минимум 6 символов";
        hasError = true;
      }
    }

    if (hasError) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({ fullName: "", username: "", password: "" });

    try {
      setIsSaving(true);
      if (editingUser) {
        await updateAdminUser(token, editingUser.id, {
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          role: form.role,
        });
      } else {
        const response = await createAdminUser(token, {
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
        });
        setTemporaryPassword(response.temporaryPassword);
      }
      await loadUsers();
      handleCloseModal();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось сохранить пользователя."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenToggle(user: User) {
    setUserToToggle(user);
  }

  function handleCloseToggle() {
    setUserToToggle(null);
    setDeactivationReason("");
    setError("");
  }

  async function confirmToggleStatus() {
    if (!token || !userToToggle) return;

    setError("");
    try {
      const isBlocking = userToToggle.isActive;
      const reason = isBlocking ? deactivationReason.trim() : "";
      
      await setAdminUserStatus(token, userToToggle.id, !userToToggle.isActive, reason);
      await loadUsers();
      handleCloseToggle();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Не удалось изменить статус пользователя."
      );
    }
  }

  async function handleHardDeleteUser(user: User) {
    if (!token || !window.confirm(`Вы уверены, что хотите НАВСЕГДА удалить пользователя ${user.fullName}? Это действие необратимо!`)) return;
    try {
      await hardDeleteAdminUser(token, user.id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось окончательно удалить пользователя.");
    }
  }

  return (
    <AdminFrame
      title="Пользователи"
    >
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
              Пользователи <Typography component="span" variant="h6" color="text.secondary">({total})</Typography>
            </Typography>
          </Box>

          <Button variant="contained" size="large" onClick={handleOpenCreate} fullWidth>
            Создать пользователя
          </Button>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
            <Stack spacing={2}>
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по имени или логину"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="users-role-filter-label">Роль</InputLabel>
                <Select
                  labelId="users-role-filter-label"
                  value={role}
                  label="Роль"
                  onChange={(event) => setRole(event.target.value)}
                >
                  <MenuItem value="">Все роли</MenuItem>
                  <MenuItem value="user">Читатель</MenuItem>
                  <MenuItem value="admin">Библиотекарь</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="users-status-filter-label">Статус</InputLabel>
                <Select
                  labelId="users-status-filter-label"
                  value={status}
                  label="Статус"
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <MenuItem value="">Все статусы</MenuItem>
                  <MenuItem value="active">Активные</MenuItem>
                  <MenuItem value="inactive">Отключенные</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>
        </Box>

        <Stack spacing={3} sx={{ flexGrow: 1, minWidth: 0 }}>
          {error && !isModalOpen && <Alert severity="error">{error}</Alert>}
          {temporaryPassword && (
            <Alert severity="success" onClose={() => setTemporaryPassword("")}>
              Новый пароль пользователя: <strong>{temporaryPassword}</strong>
            </Alert>
          )}

          <TableContainer component={Paper} sx={tableSurfaceSx}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Пользователь</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Создан</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items
                  .filter((item) => currentUser?.role === "superadmin" || item.role !== "superadmin")
                  .map((item) => {
                  const isSelf = currentUser?.id === item.id;
                  const canEdit = item.role === "user" || currentUser?.role === "superadmin";
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{item.fullName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.username}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.role === "superadmin" ? "Супер-админ" : item.role === "admin" ? "Библиотекарь" : "Читатель"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.isActive ? "Активен" : "Отключен"}
                          sx={statusToneChipSx(item.isActive ? "success" : "danger")}
                        />
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                          {canEdit && (
                            <>
                              <Tooltip title="Редактировать">
                                <span>
                                  <IconButton
                                    type="button"
                                    size="small"
                                    aria-label="Редактировать"
                                    onClick={() => handleOpenEdit(item)}
                                    sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx] as any}
                                  >
                                    <EditRoundedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>

                            </>
                          )}
                          {(canEdit || (isSelf && !item.isActive)) && (
                            <Tooltip title={item.isActive ? "Отключить" : "Восстановить"}>
                              <span>
                                <IconButton
                                  type="button"
                                  size="small"
                                  aria-label={item.isActive ? "Отключить" : "Восстановить"}
                                  disabled={isSelf && item.isActive}
                                  onClick={() => handleOpenToggle(item)}
                                  sx={[
                                    cardActionIconButtonSx,
                                    item.isActive
                                      ? cardActionIconButtonDangerSx
                                      : cardActionIconButtonPrimarySx,
                                  ] as any}
                                >
                                  {item.isActive ? (
                                    <BlockRoundedIcon fontSize="small" />
                                  ) : (
                                    <RestoreRoundedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {currentUser?.role === "superadmin" && !isSelf && (
                            <Tooltip title="Удалить навсегда">
                              <span>
                                <IconButton
                                  type="button"
                                  size="small"
                                  aria-label="Удалить навсегда"
                                  onClick={() => handleHardDeleteUser(item)}
                                  sx={[cardActionIconButtonSx, cardActionIconButtonDangerSx] as any}
                                >
                                  <DeleteForeverRoundedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary">
                        Пользователи по текущим фильтрам не найдены.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {total > 50 && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              rowsPerPage={50}
            rowsPerPageOptions={[50]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
            />
          )}
        </Stack>
      </Box>

      <Dialog open={!!userToToggle} onClose={handleCloseToggle}>
        <DialogTitle>Подтверждение действия</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите {userToToggle?.isActive ? "отключить" : "восстановить"} пользователя <strong>{userToToggle?.fullName}</strong>?
          </DialogContentText>
          {userToToggle?.isActive && (
            <TextField
              sx={{ mt: 2 }}
              fullWidth
              label="Причина деактивации"
              placeholder="Укажите причину (опционально)"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              multiline
              rows={3}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseToggle}>Отмена</Button>
          <Button variant="contained" color={userToToggle?.isActive ? "error" : "primary"} onClick={() => void confirmToggleStatus()}>
            {userToToggle?.isActive ? "Отключить" : "Восстановить"}
          </Button>
        </DialogActions>
      </Dialog>



      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit} noValidate>
          <DialogTitle>
            {editingUser ? "Редактирование пользователя" : "Создать пользователя"}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              
              <TextField
                label="ФИО"
                value={form.fullName}
                onChange={(event) =>
                  {
                    setForm((current) => ({ ...current, fullName: event.target.value }));
                    if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                  }
                }
                fullWidth
                inputProps={{ "aria-label": "ФИО", maxLength: 100 }}
                error={!!fieldErrors.fullName}
                helperText={fieldErrors.fullName}
              />
              <TextField
                label="Логин"
                value={form.username}
                onChange={(event) =>
                  {
                    setForm((current) => ({ ...current, username: event.target.value }));
                    if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: "" }));
                  }
                }
                fullWidth
                inputProps={{ "aria-label": "Логин", maxLength: 30 }}
                error={!!fieldErrors.username}
                helperText={fieldErrors.username}
              />
              {currentUser?.role === "superadmin" && (
                <FormControl fullWidth>
                  <InputLabel id="role-select-label">Роль</InputLabel>
                  <Select
                    labelId="role-select-label"
                    value={form.role}
                    label="Роль"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as User["role"],
                      }))
                    }
                  >
                    <MenuItem value="user">Читатель</MenuItem>
                    <MenuItem value="admin">Библиотекарь</MenuItem>
                    <MenuItem value="superadmin">Супер-админ</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {!editingUser && (
                <TextField
                  label="Пароль"
                  value={form.password}
                  onChange={(event) =>
                    {
                      setForm((current) => ({ ...current, password: event.target.value }));
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }
                  }
                  fullWidth
                  placeholder="Введите пароль (минимум 6 символов)"
                  inputProps={{ maxLength: 50 }}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} type="button">
              Отмена
            </Button>
            <Button variant="contained" type="submit" disabled={isSaving}>
              {editingUser ? "Сохранить" : "Создать"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </AdminFrame>
  );
};

export default AdminUsersPage;
