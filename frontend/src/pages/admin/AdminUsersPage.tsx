import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import {
  createAdminUser,
  getAdminUsers,
  setAdminUserStatus,
  updateAdminUser,
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(() => createEmptyForm());
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const activeCount = useMemo(
    () => items.filter((item) => item.isActive).length,
    [items]
  );

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
    setIsModalOpen(true);
  }

  function handleOpenEdit(user: User) {
    setEditingUser(user);
    setForm(createEditForm(user));
    setError("");
    setTemporaryPassword("");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setError("");

    if (!form.username.trim() || !form.fullName.trim()) {
      setError("Заполните ФИО и логин пользователя.");
      return;
    }

    try {
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
    }
  }

  function handleOpenToggle(user: User) {
    setUserToToggle(user);
  }

  function handleCloseToggle() {
    setUserToToggle(null);
    setError("");
  }

  async function confirmToggleStatus() {
    if (!token || !userToToggle) return;

    setError("");
    try {
      await setAdminUserStatus(token, userToToggle.id, !userToToggle.isActive);
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

  return (
    <AdminFrame
      title="Пользователи"
      chips={[
        { label: `Всего: ${items.length}` },
        { label: `Активные: ${activeCount}` },
        { label: `Отключены: ${items.length - activeCount}` },
      ]}
    >
      <ContentCard>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack>
              <Typography variant="caption" sx={eyebrowSx}>
                Управление доступом
              </Typography>
              <Typography component="h2" variant="h5">
                Пользователи библиотеки
              </Typography>
            </Stack>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenCreate}
            >
              Создать пользователя
            </Button>
          </Stack>

          <Paper sx={filterPanelSx}>
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по имени или логину"
                sx={{ minWidth: 280 }}
              />
              <FormControl sx={{ minWidth: 180 }}>
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
              <FormControl sx={{ minWidth: 180 }}>
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
          </Paper>

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
                {items.map((item) => {
                  const isSelf = currentUser?.id === item.id;
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
                          label={item.role === "admin" ? "Библиотекарь" : "Читатель"}
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
                          <Tooltip title="Редактировать">
                            <IconButton
                              type="button"
                              size="small"
                              aria-label="Редактировать"
                              onClick={() => handleOpenEdit(item)}
                              sx={[cardActionIconButtonSx, cardActionIconButtonPrimarySx]}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={item.isActive ? "Отключить" : "Включить"}>
                            <span>
                              <IconButton
                                type="button"
                                size="small"
                                aria-label={item.isActive ? "Отключить" : "Включить"}
                                disabled={isSelf && item.isActive}
                                onClick={() => handleOpenToggle(item)}
                                sx={[
                                  cardActionIconButtonSx,
                                  item.isActive
                                    ? cardActionIconButtonDangerSx
                                    : cardActionIconButtonPrimarySx,
                                ]}
                              >
                                {item.isActive ? (
                                  <BlockRoundedIcon fontSize="small" />
                                ) : (
                                  <CheckCircleRoundedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
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
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={50}
            rowsPerPageOptions={[50]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
          />
        </Stack>
      </ContentCard>

      <Dialog open={!!userToToggle} onClose={handleCloseToggle}>
        <DialogTitle>Подтверждение действия</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите {userToToggle?.isActive ? "отключить" : "включить"} пользователя <strong>{userToToggle?.fullName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseToggle}>Отмена</Button>
          <Button variant="contained" color={userToToggle?.isActive ? "error" : "primary"} onClick={() => void confirmToggleStatus()}>
            {userToToggle?.isActive ? "Отключить" : "Включить"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
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
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                required
                fullWidth
                inputProps={{ "aria-label": "ФИО" }}
              />
              <TextField
                label="Логин"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                required
                fullWidth
                inputProps={{ "aria-label": "Логин" }}
              />
              <FormControl fullWidth>
                <InputLabel id="dialog-role-form-label">Роль</InputLabel>
                <Select
                  labelId="dialog-role-form-label"
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
                </Select>
              </FormControl>
              
              {!editingUser && (
                <TextField
                  label="Пароль"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  fullWidth
                  placeholder="Оставьте пустым для автогенерации"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} type="button">
              Отмена
            </Button>
            <Button variant="contained" type="submit">
              {editingUser ? "Сохранить" : "Создать"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </AdminFrame>
  );
};

export default AdminUsersPage;
