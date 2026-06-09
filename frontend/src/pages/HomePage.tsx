import React, { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  InputBase,
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
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import SearchBar from "../components/SearchBar";
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

  async function submitSearch(event?: React.FormEvent) {
    event?.preventDefault();
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
            component="img"
            src="/ips-logo.jpg"
            alt="Логотип ИПС"
            sx={{
              flexShrink: 0,
              width: { xs: 80, sm: 120, md: 160 },
              height: { xs: 80, sm: 120, md: 160 },
              objectFit: "contain",
            }}
          />

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
                <Box sx={{ display: "flex", gap: 1.2 }}>
                  <InputBase
                    placeholder="Название, автор, тип документа"
                    inputProps={{ "aria-label": "Поиск документов" }}
                    sx={{
                      flex: 1,
                      px: 2.2,
                      py: 1.1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      backgroundColor: "background.paper",
                      fontSize: 16,
                    }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => window.setTimeout(() => setShowHistory(false), 150)}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    sx={{
                      px: 3.5,
                      boxShadow: "none",
                      fontSize: 15,
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
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: "1fr",
            alignItems: "start",
          }}
        >
          <PaginatedDocumentList
            items={displayedRecentItems}
            total={displayedRecentItems.length}
            page={1}
            pageSize={4}
            onPageChange={() => {}}
            token={token}
            limit={4}
            emptyMessage="Вы пока не просматривали документы"
            actionsRenderer={(item) => (
              <DocumentCardActions
                item={item}
                token={token}
                onOpen={handleQuickOpen}
                onToggleFavorite={toggleFavorite}
              />
            )}
          />
        </Box>
      </ContentCard>

      {user?.role !== "admin" && (
        <Paper
          sx={{
            p: { xs: 2.5, md: 3 },
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 3,
            borderColor: (theme) => alpha(theme.palette.secondary.main, 0.4),
            backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.05),
          }}
        >
          <Box>
            <Typography variant="overline" color="secondary.main" fontWeight={600}>
              Сотрудничество
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, mb: 0.5 }}>
              Не нашли нужный материал?
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Вы можете загрузить свой PDF-документ. После быстрой модерации он появится в общем каталоге.
            </Typography>
          </Box>
          <Button component={Link} to="/submit" variant="contained" size="large" sx={{ flexShrink: 0 }}>
            Предложить документ
          </Button>
        </Paper>
      )}
    </PageShell>
  );
};

export default HomePage;


