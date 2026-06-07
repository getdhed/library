import React, { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import {
  getHome,
  getSuggestions,
  markOpened,
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentCardActions from "../components/DocumentCardActions";
import { ContentCard, PageShell } from "../components/mui-primitives";
import DocumentListItem from "../components/DocumentListItem";
import type { DocumentItem } from "../types";

const HomePage: React.FC = () => {
  const { token } = useAuth();
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
    const trimmed = query.trim();
    if (!token || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      getSuggestions(token, trimmed)
        .then((payload) => setSuggestions(payload.items.slice(0, 5)))
        .catch(console.error);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, token]);

  const dropdownItems = useMemo(() => {
    if (query.trim().length >= 2) {
      return suggestions.map((item) => ({
        key: `doc-${item.id}`,
        label: item.title,
        type: item.type,
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
      type: "",
      onClick: () => navigate(`/search?q=${encodeURIComponent(item.query)}`),
    }));
  }, [historyItems, navigate, query, suggestions, token]);

  const showDropdown = showHistory && dropdownItems.length > 0;

  async function openSuggestedDocument(item: DocumentItem) {
    if (!token) return;
    await markOpened(token, item.id);
    navigate(`/documents/${item.id}`);
  }

  function handleQuickOpen(id: number) {
    if (!token) return;
    void markOpened(token, id).catch(console.error);
  }

  async function toggleFavorite(id: number, isFavorite: boolean) {
    if (!token) return;

    await toggleDocumentFavorite(token, id, isFavorite);
    setRecentItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isFavorite: !isFavorite } : item
      )
    );
    setSuggestions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isFavorite: !isFavorite } : item
      )
    );
  }

  async function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (showDropdown && trimmedQuery && suggestions.length > 0) {
      await openSuggestedDocument(suggestions[0]);
      setShowHistory(false);
      return;
    }

    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  }

  const displayedRecentItems = recentItems.slice(0, 4);

  return (
    <PageShell>
      <Paper
        component="section"
        sx={{
          p: 0,
          overflow: "hidden",
          bgcolor: "primary.dark",
          borderColor: (theme) => alpha(theme.palette.secondary.main, 0.4),
          color: (theme) => alpha(theme.palette.primary.contrastText, 0.95),
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(154,171,130,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(154,171,130,0.08) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            background: (theme) =>
              `linear-gradient(to bottom, ${theme.palette.secondary.main}, transparent)`,
          }}
        />

        <Box
          sx={{
            position: "relative",
            p: 3.2,
            display: "flex",
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: { xs: 80, sm: 120, md: 160 },
              height: { xs: 80, sm: 120, md: 160 },
              display: "grid",
              placeItems: "center",
              border: "1px dashed rgba(255,255,255,0.3)",
              color: "primary.contrastText",
            }}
          >
            <Typography variant="caption" sx={{ textAlign: "center" }}>
              Логотип
              <br />
              ИПС
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                mt: 0,
                fontSize: "clamp(2.4rem, 4.2vw, 4.2rem)",
                color: "primary.contrastText",
                mb: 1.8,
              }}
            >
              Онлайн библиотека института пограничной службы
            </Typography>

            <Paper
              component="aside"
              sx={{
                p: 2.1,
                borderRadius: 0,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderColor: "rgba(154,171,130,0.24)",
                position: "relative",
                mb: 2.1,
                width: "100%",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: (theme) =>
                    `linear-gradient(to right, ${theme.palette.secondary.main}, transparent)`,
                },
              }}
            >
              <Box component="form" onSubmit={submitSearch} sx={{ position: "relative" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  <Box
                    component="input"
                    aria-label="Поиск документов"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => window.setTimeout(() => setShowHistory(false), 150)}
                    placeholder="Название, автор, тип документа"
                    sx={{
                      flex: 1,
                      minHeight: 56,
                      minWidth: 0,
                      borderRadius: 0,
                      border: "1px solid rgba(154,171,130,0.25)",
                      borderRight: 0,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "primary.contrastText",
                      px: 1.8,
                      font: "inherit",
                      fontSize: "1rem",
                      outline: 0,
                      "&::placeholder": {
                        color: (theme) => alpha(theme.palette.primary.contrastText, 0.5),
                      },
                      "&:hover": {
                        borderColor: "rgba(184,151,42,0.9)",
                      },
                      "&:focus": {
                        borderColor: "secondary.main",
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    aria-label="Поиск"
                    sx={{
                      minWidth: 150,
                      minHeight: 56,
                      px: 3,
                      borderRadius: 0,
                      justifyContent: "center",
                      bgcolor: "error.main",
                      color: "primary.contrastText",
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.error.main, 0.9)}`,
                      borderLeft: 0,
                      "&:hover": {
                        bgcolor: "#a02525",
                      },
                    }}
                  >
                    Поиск
                  </Button>
                </Box>

                {showDropdown && (
                  <Paper
                    sx={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      borderRadius: 0,
                      maxHeight: 320,
                      overflowY: "auto",
                    }}
                  >
                    {dropdownItems.map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        fullWidth
                        color="inherit"
                        onClick={item.onClick}
                        sx={{
                          justifyContent: "flex-start",
                          borderRadius: 0,
                          px: 1.7,
                          py: 1.1,
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize: 14,
                            fontWeight: 500,
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: "100%",
                          }}
                        >
                          {item.label}
                        </Typography>
                        {item.type && (
                          <Typography
                            component="span"
                            sx={{
                              fontSize: 11,
                              color: "text.secondary",
                              lineHeight: 1.2,
                              mt: 0.2,
                            }}
                          >
                            {item.type}
                          </Typography>
                        )}
                      </Button>
                    ))}
                  </Paper>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>

      <ContentCard>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h5">Недавние документы</Typography>
          <Button component={Link} to="/search" variant="text" color="error">
            Все документы
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: "1fr",
            alignItems: "start",
          }}
        >
          {displayedRecentItems.map((item, index) => (
            <DocumentListItem
              key={item.id}
              item={item}
              token={token}
              priorityCover={index === 0}
              actions={
                <DocumentCardActions
                  item={item}
                  token={token}
                  onOpen={handleQuickOpen}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
          ))}

          {displayedRecentItems.length === 0 && (
            <Paper sx={{ p: 2.25, borderRadius: 0, gridColumn: "1 / -1" }}>
              <Typography variant="h6">Вы пока не просматривали документы</Typography>
            </Paper>
          )}
        </Box>
      </ContentCard>

      <Paper
        sx={{
          p: 0,
          overflow: "hidden",
          borderColor: (theme) => alpha(theme.palette.secondary.main, 0.4),
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.08),
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 2.5,
            p: 2.6,
          }}
        >
          <Box>
            <Typography variant="overline" color="secondary.main">
              Сотрудничество
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.8 }}>
              Предложить материал
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.1, maxWidth: "64ch" }}>
              Вы можете загрузить PDF-документ для рассмотрения администратором
              библиотеки. После проверки материал появится в каталоге.
            </Typography>
            <Stack direction="row" spacing={1.2} sx={{ mt: 1.8 }}>
              <Button component={Link} to="/submit" variant="contained">
                Перейти к загрузке
              </Button>
              <Button component={Link} to="/account/pdfs" variant="outlined">
                Мои PDF
              </Button>
            </Stack>
          </Box>

          <Paper
            component={Link}
            to="/submit"
            sx={{
              textDecoration: "none",
              color: "inherit",
              p: 2.2,
              borderStyle: "dashed",
              borderColor: (theme) => alpha(theme.palette.secondary.main, 0.55),
              backgroundColor: (theme) => alpha(theme.palette.background.default, 0.85),
              display: "grid",
              alignContent: "center",
              justifyItems: "start",
              gap: 1,
            }}
          >
            <Typography variant="h6">Загрузить PDF</Typography>
            <Typography color="text.secondary">
              Перетащите файл или откройте форму отправки.
            </Typography>
            <Button variant="outlined" color="error" sx={{ mt: 0.3 }}>
              Открыть форму
            </Button>
          </Paper>
        </Box>
      </Paper>
    </PageShell>
  );
};

export default HomePage;


