import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Link, useNavigate } from "react-router-dom";
import { getHome, getSuggestions, markOpened } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageShell } from "../components/mui-primitives";
import DocumentListItem from "../components/DocumentListItem";
import type { DocumentItem } from "../types";

const HomePage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recentItems, setRecentItems] = useState<DocumentItem[]>([]);
  const [historyItems, setHistoryItems] = useState<{ id: number; query: string }[]>([]);
  const [suggestions, setSuggestions] = useState<DocumentItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!token) return;
    getHome(token)
      .then((payload) => {
        setRecentItems(payload.recent);
        setHistoryItems(payload.searchHistory);
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      getSuggestions(token, query.trim())
        .then((payload) => setSuggestions(payload.items))
        .catch(console.error);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query, token]);

  const dropdownItems = useMemo(() => {
    if (query.trim()) {
      return suggestions.map((item) => ({
        key: `doc-${item.id}`,
        label: item.title,
        onClick: async () => {
          if (!token) return;
          await markOpened(token, item.id);
          navigate(`/documents/${item.id}`);
        },
      }));
    }

    return historyItems.map((item) => ({
      key: `history-${item.id}`,
      label: item.query,
      onClick: () => navigate(`/search?q=${encodeURIComponent(item.query)}`),
    }));
  }, [historyItems, navigate, query, suggestions, token]);

  const showDropdown = showHistory && dropdownItems.length > 0;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <PageShell>
      <Paper
        sx={{
          borderRadius: 4,
          p: { xs: 2.25, md: 3.2 },
          background:
            "linear-gradient(145deg, rgba(10,108,116,0.16) 0%, rgba(255,253,248,0.96) 48%, rgba(10,108,116,0.08) 100%)",
        }}
      >
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, xl: 8 }}>
            <Chip label="Material Green" sx={{ mb: 1.5 }} />
            <Typography component="h1" variant="h3" sx={{ mb: 1.2, maxWidth: "14ch" }}>
              Быстрый поиск по библиотеке PDF
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.2, maxWidth: "70ch" }}>
              Новый интерфейс объединяет каталог, историю запросов, избранное и
              личные PDF в одном зелёном Material-style рабочем пространстве.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1}>
              <Button component={Link} to="/catalog" variant="contained">
                Открыть каталог
              </Button>
              <Button component={Link} to="/favorites" variant="outlined">
                Избранное
              </Button>
              {user?.role === "user" && (
                <Button component={Link} to="/account/pdfs" variant="outlined">
                  Мои PDF
                </Button>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, xl: 4 }}>
            <Stack spacing={1.1}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography color="text.secondary">Документов под рукой</Typography>
                <Typography variant="h4" fontWeight={800}>{recentItems.length}</Typography>
              </Paper>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography color="text.secondary">Сохранённые запросы</Typography>
                <Typography variant="h4" fontWeight={800}>{historyItems.length}</Typography>
              </Paper>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography color="text.secondary">Рабочий сценарий</Typography>
                <Typography>
                  Ищите материалы, открывайте PDF, сохраняйте документы и
                  следите за модерацией из одного интерфейса.
                </Typography>
              </Paper>
            </Stack>
          </Grid>
        </Grid>

        <Box component="form" onSubmit={submitSearch} sx={{ mt: 2.2, position: "relative" }}>
          <Stack direction="row" spacing={1.2}>
            <TextField
              label="Поиск документов"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => window.setTimeout(() => setShowHistory(false), 150)}
              placeholder="Название, автор, кафедра"
              fullWidth
            />
            <IconButton
              type="submit"
              color="primary"
              aria-label="Поиск"
              title="Поиск"
              sx={{
                width: 54,
                height: 54,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              }}
            >
              <SearchRoundedIcon />
            </IconButton>
          </Stack>

          {showDropdown && (
            <Paper sx={{ position: "absolute", top: "calc(100% + 10px)", left: 0, right: 78, zIndex: 20, borderRadius: 2.25 }}>
              <Typography sx={{ px: 1.7, py: 1, borderBottom: (theme) => `1px solid ${theme.palette.divider}`, color: "text.secondary", fontSize: 12 }}>
                {query.trim() ? "Подходящие документы" : "Последние запросы"}
              </Typography>

              {dropdownItems.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  fullWidth
                  color="inherit"
                  onClick={item.onClick}
                  sx={{ justifyContent: "flex-start", borderRadius: 0, px: 1.7, py: 1.1 }}
                >
                  {item.label}
                </Button>
              ))}
            </Paper>
          )}
        </Box>
      </Paper>

      <ContentCard>
        <Typography variant="h5" sx={{ mb: 1.5 }}>
          Недавние документы
        </Typography>

        <Stack spacing={1.5}>
          {recentItems.map((item) => (
            <DocumentListItem key={item.id} item={item} token={token} />
          ))}

          {recentItems.length === 0 && (
            <Paper sx={{ p: 2.25, borderRadius: 3 }}>
              <Typography variant="h6">Нет недавних документов</Typography>
            </Paper>
          )}
        </Stack>
      </ContentCard>
    </PageShell>
  );
};

export default HomePage;
