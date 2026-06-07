import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { createSubmission } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";

const emptyForm = {
  title: "",
  author: "",
  comment: "",
  file: null as File | null,
};

const SubmitPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setError("");

    if (!form.file) {
      setError("Выберите PDF-файл.");
      return;
    }

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("file", form.file);
    if (form.author.trim()) {
      formData.set("author", form.author.trim());
    }
    if (form.comment.trim()) {
      formData.set("comment", form.comment.trim());
    }

    setIsSubmitting(true);
    try {
      await createSubmission(token, formData);
      setForm(emptyForm);
      navigate("/account/pdfs", {
        state: { submissionCreated: true },
      });
    } catch (submitError) {
      console.error(submitError);
      setError("Не удалось отправить PDF. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell>
      <ContentCard>
        <PageHeader
          eyebrow="Предложить PDF"
          title="Загрузка пользовательского документа"
          side={
            <Button component={Link} to="/account/pdfs" variant="outlined">
              Перейти в мои PDF
            </Button>
          }
        />

        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Отправьте PDF и минимальные данные, а админ проверит файл и оформит
          его как обычный документ каталога. Все статусы и решения модерации
          появятся в разделе <Link to="/account/pdfs">Мои PDF</Link>.
        </Typography>

        <Stack component="form" spacing={1.75} sx={{ mt: 2.5 }} onSubmit={handleSubmit}>
          <TextField
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Название"
            disabled={isSubmitting}
            required
            fullWidth
          />

          <TextField
            value={form.author}
            onChange={(event) =>
              setForm((current) => ({ ...current, author: event.target.value }))
            }
            placeholder="Автор (необязательно)"
            disabled={isSubmitting}
            fullWidth
          />

          <Box sx={{ display: "grid", gap: 0.8 }}>
            <Typography fontWeight={600}>
              PDF-файл
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
              <Button component="label" variant="outlined" type="button" disabled={isSubmitting}>
                {form.file ? "Заменить PDF" : "Выбрать PDF"}
                <Box
                  component="input"
                  type="file"
                  aria-label="PDF-файл"
                  accept=".pdf,application/pdf"
                  disabled={isSubmitting}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      file: event.target.files?.[0] ?? null,
                    }))
                  }
                  required
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

          <TextField
            value={form.comment}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
            placeholder="Комментарий для модератора (необязательно)"
            disabled={isSubmitting}
            multiline
            minRows={4}
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Button variant="contained" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Отправляется..." : "Отправить PDF"}
            </Button>
          </Box>
        </Stack>
      </ContentCard>
    </PageShell>
  );
};

export default SubmitPage;
