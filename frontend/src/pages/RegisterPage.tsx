import React, { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthPageFrame from "../components/AuthPageFrame";
import { eyebrowSx } from "../components/mui-primitives";

const registerHighlights = [
  {
    label: "Личный раздел PDF",
    value: "Заявки, статусы модерации и итоговые документы доступны из аккаунта.",
  },
  {
    label: "Удобный каталог",
    value: "Поиск, избранное, карточки документов и быстрый просмотр в едином стиле.",
  },
  {
    label: "Зелёная тема",
    value: "Светлый режим с Material-палитрой и тёмная зелёная тема для работы вечером.",
  },
];

const RegisterPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await auth.register({ fullName, email, password });
      navigate("/");
    } catch {
      setError("Не удалось зарегистрироваться. Возможно, email уже занят.");
    }
  }

  return (
    <AuthPageFrame
      heroBadge="Create Account"
      heroEyebrow="Регистрация"
      heroTitle="Создайте аккаунт библиотеки и отправляйте свои PDF"
      heroDescription="Новый интерфейс делает каталог, избранное и пользовательскую модерацию заметно чище и удобнее."
      highlights={registerHighlights}
      formContent={
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <Stack spacing={0}>
            <Chip
              label="Новый аккаунт"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ width: "fit-content" }}
            />
            <Typography variant="caption" sx={[eyebrowSx, { display: "block", mt: 1.2 }] }>
              Регистрация
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.8 }}>
              Создайте профиль
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              После регистрации вы сразу попадёте в каталог и сможете
              предлагать новые PDF на модерацию.
            </Typography>
          </Stack>

          <TextField
            label="Имя"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ваше имя"
            fullWidth
          />

          <TextField
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@library.local"
            fullWidth
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Создайте пароль"
            type="password"
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button type="submit" variant="contained" size="large">
            Зарегистрироваться
          </Button>

          <Typography color="text.secondary">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </Typography>
        </Stack>
      }
    />
  );
};

export default RegisterPage;
