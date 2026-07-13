import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SettingsBackupRestoreRoundedIcon from "@mui/icons-material/SettingsBackupRestoreRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import {
  getAdminDocuments,
  getDocumentTypes,
  restoreDocument,
  hardDeleteDocument,
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
  DocumentItem,
  PagedDocuments,
} from "../../types";

const AdminArchivePage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);

  const [search, setSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFromFilter, setYearFromFilter] = useState("");
  const [yearToFilter, setYearToFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);

  const [documentTypes, setDocumentTypes] = useState<string[]>([]);



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
      includeDeleted: 1,
    });
    setPayload(response);
  }

  useEffect(() => {
    if (!token) return;
    getDocumentTypes().then((res) => setDocumentTypes(res.items)).catch(console.error);
  }, [token]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [authorFilter, documentTypeFilter, search, sort, tagsFilter, token, yearFromFilter, yearToFilter, page]);

  async function handleRestore(id: number) {
    if (!token || !window.confirm("Восстановить документ?")) return;
    await restoreDocument(token, id);
    await loadDocuments();
  }

  async function handleHardDelete(id: number) {
    if (!token || !window.confirm("Вы уверены, что хотите ОКОНЧАТЕЛЬНО удалить этот документ? Это действие необратимо!")) return;
    try {
      await hardDeleteDocument(token, id);
      await loadDocuments();
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить документ окончательно");
    }
  }

  return (
    <AdminFrame title="Корзина">
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
          </Box>



          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Фильтры</Typography>
            <Stack spacing={2}>
              <TextField
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Поиск по названию"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="catalog-type-label">Тип документа</InputLabel>
                <Select
                  labelId="catalog-type-label"
                  value={documentTypeFilter}
                  label="Тип документа"
                  onChange={(event) => { setDocumentTypeFilter(event.target.value); setPage(1); }}
                >
                  <MenuItem value="">Все типы</MenuItem>
                  {documentTypes.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                value={authorFilter}
                onChange={(event) => { setAuthorFilter(event.target.value); setPage(1); }}
                label="Автор"
                placeholder="Введите автора"
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  value={yearFromFilter}
                  onChange={(event) => { setYearFromFilter(event.target.value); setPage(1); }}
                  label="Год с"
                  type="number"
                  fullWidth
                />
                <TextField
                  value={yearToFilter}
                  onChange={(event) => { setYearToFilter(event.target.value); setPage(1); }}
                  label="Год по"
                  type="number"
                  fullWidth
                />
              </Stack>
              <TextField
                value={tagsFilter}
                onChange={(event) => { setTagsFilter(event.target.value); setPage(1); }}
                label="Ключевые слова"
                placeholder="Теги через пробел, запятую или ;"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="catalog-sort-label">Сортировка</InputLabel>
                <Select
                  labelId="catalog-sort-label"
                  value={sort}
                  label="Сортировка"
                  onChange={(event) => { setSort(event.target.value); setPage(1); }}
                >
                  <MenuItem value="date_desc">Новые</MenuItem>
                  <MenuItem value="date_asc">Старые</MenuItem>
                  <MenuItem value="views_desc">По просмотрам</MenuItem>
                  <MenuItem value="title_asc">А-Я</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  setSearch("");
                  setDocumentTypeFilter("");
                  setAuthorFilter("");
                  setYearFromFilter("");
                  setYearToFilter("");
                  setTagsFilter("");
                  setSort("date_desc");
                  setPage(1);
                }}
                disabled={!search && !documentTypeFilter && !authorFilter && !yearFromFilter && !yearToFilter && !tagsFilter && sort === "date_desc"}
              >
                Сбросить
              </Button>
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
                      <TableRow 
                        key={item.id} 
                        hover
                        onClick={() => navigate(`/documents/${item.id}`)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ maxWidth: 560 }}>
                          <Typography variant="body2" sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-word"
                          }}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" display="block" color="error">
                            Удалено: {new Date(item.deletedAt ?? "").toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-word"
                          }}>
                            {item.type}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.year > 0 ? item.year : "—"}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                            <Tooltip title="Восстановить">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); void handleRestore(item.id); }} sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonPrimarySx } as any}>
                                <SettingsBackupRestoreRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {user?.role === "superadmin" && (
                              <Tooltip title="Удалить навсегда">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); void handleHardDelete(item.id); }} sx={{ ...cardActionIconButtonSx, ...cardActionIconButtonDangerSx } as any}>
                                  <DeleteForeverRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
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
                  <Card 
                    key={item.id} 
                    sx={{ borderRadius: 2.5, cursor: "pointer" }}
                    onClick={() => navigate(`/documents/${item.id}`)}
                  >
                    <CardContent sx={{ display: "grid", gap: 1 }}>
                      <Typography fontWeight={700}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.type} • {item.year > 0 ? item.year : "—"}</Typography>
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ px: 1.3, py: 0.95, justifyContent: "flex-end", gap: 0.6 }}>
                      <Button size="small" onClick={(e) => { e.stopPropagation(); void handleRestore(item.id); }} startIcon={<SettingsBackupRestoreRoundedIcon />}>
                        Восстановить
                      </Button>
                      {user?.role === "superadmin" && (
                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); void handleHardDelete(item.id); }} startIcon={<DeleteForeverRoundedIcon />}>
                          Удалить
                        </Button>
                      )}
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

    </AdminFrame>
  );
};

export default AdminArchivePage;
