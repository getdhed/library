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
  toggleDocumentFavorite,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentCardActions from "../components/DocumentCardActions";
import { ContentCard, PageShell } from "../components/mui-primitives";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import SearchBar from "../components/SearchBar";
import type { DocumentItem } from "../types";
import { getBackgroundUrl } from "../api/library";

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
    if (!token) {
      setSuggestions([]);
      return;
    }

    // If input shorter than 2 chars, we don't fetch suggestions
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      getSuggestions(token, trimmed, { signal: controller.signal })
        .then((payload) => setSuggestions(payload.items.slice(0, 4)))
        .catch((err) => {
          if (err?.name !== "AbortError") console.error(err);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, token]);

  const dropdownItems = useMemo(() => {
    if (query.trim().length >= 2) {
      return suggestions.map((item) => ({
        key: `doc-${item.id}`,
        label: item.title,
        type: item.type,
        onClick: () => navigate(`/documents/${item.id}`),
      }));
    }

    return historyItems.slice(0, 5).map((item) => ({
      key: `history-${item.id}`,
      label: item.query,
      type: "",
      onClick: () => navigate(`/search?q=${encodeURIComponent(item.query)}`),
    }));
  }, [historyItems, navigate, query, suggestions]);

  const showDropdown = showHistory && dropdownItems.length > 0;

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

    setShowHistory(false);
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
          position: "relative",
          bgcolor: "primary.dark",
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            p: 3.2,
            color: "primary.contrastText",
          }}
        >
          <Box sx={{ mb: 1.8 }}>
            <Typography
              component="span"
              sx={{
                display: "block",
                fontSize: "clamp(1.1rem, 1.5vw, 1.5rem)",
                opacity: 0.9,
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Онлайн-библиотека
            </Typography>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                mt: 0,
                fontSize: "clamp(1.1rem, 2.2vw, 2.2rem)",
                lineHeight: 1.2,
              }}
            >
              ГУО «ИНСТИТУТ ПОГРАНИЧНОЙ СЛУЖБЫ РЕСПУБЛИКИ БЕЛАРУСЬ»
            </Typography>
          </Box>

          <Paper
            component="aside"
            sx={{
              p: 2.1,
              borderRadius: 0,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderColor: "rgba(154,171,130,0.24)",
              position: "relative",
              mb: 0,
              width: "100%",
              backdropFilter: "blur(8px)",
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
            <Box component="form" onSubmit={submitSearch}>
              <Box sx={{ display: "flex", gap: 1.2 }}>
                <Box sx={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <InputBase
                    placeholder="Название, автор, тип документа"
                    inputProps={{ "aria-label": "Поиск документов" }}
                    sx={{
                      width: "100%",
                      px: 2.2,
                      py: 1.1,
                      border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      backgroundColor: "rgba(255,255,255,0.92)",
                      fontSize: 16,
                      color: "#1a2e1a",
                    }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => window.setTimeout(() => setShowHistory(false), 150)}
                  />
                  {showDropdown && (
                    <Paper
                      sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: (theme) => theme.zIndex.modal + 1,
                        borderRadius: 0,
                        bgcolor: "background.paper",
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderTop: 0,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
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
                            "&:hover": { bgcolor: "action.hover" },
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
            </Box>
          </Paper>
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
            onPageChange={() => { }}
            token={token}
            limit={4}
            emptyMessage="Вы пока не просматривали документы"
            actionsRenderer={(item) => (
              <DocumentCardActions
                item={item}
                onToggleFavorite={toggleFavorite}
              />
            )}
          />
        </Box>
      </ContentCard>

      {user?.role === "user" && (
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


