import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import {
  createSubmission,
  getDepartments,
  getFaculties,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import { ContentCard, PageHeader, PageShell } from "../components/mui-primitives";
import type { Department, Faculty } from "../types";

const emptyForm = {
  title: "",
  author: "",
  facultyId: "",
  departmentId: "",
  comment: "",
  file: null as File | null,
};

const SubmitPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getFaculties()
      .then((response) => setFaculties(response.items))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.facultyId) {
      setDepartments([]);
      return;
    }

    getDepartments(Number(form.facultyId))
      .then((response) => setDepartments(response.items))
      .catch(console.error);
  }, [form.facultyId]);

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
    if (form.departmentId) {
      formData.set("departmentId", form.departmentId);
    }
    if (form.comment.trim()) {
      formData.set("comment", form.comment.trim());
    }

    setIsSubmitting(true);
    try {
      await createSubmission(token, formData);
      setForm(emptyForm);
      setDepartments([]);
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

          <FormControl fullWidth>
            <InputLabel id="submit-faculty-label">Факультет (необязательно)</InputLabel>
            <Select
              labelId="submit-faculty-label"
              value={form.facultyId}
              disabled={isSubmitting}
              label="Факультет (необязательно)"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  facultyId: event.target.value,
                  departmentId: "",
                }))
              }
            >
              <MenuItem value="">Факультет (необязательно)</MenuItem>
              {faculties.map((faculty) => (
                <MenuItem key={faculty.id} value={String(faculty.id)}>
                  {faculty.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="submit-department-label">Кафедра (необязательно)</InputLabel>
            <Select
              labelId="submit-department-label"
              value={form.departmentId}
              disabled={!form.facultyId || isSubmitting}
              label="Кафедра (необязательно)"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  departmentId: event.target.value,
                }))
              }
            >
              <MenuItem value="">Кафедра (необязательно)</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={String(department.id)}>
                  {department.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
