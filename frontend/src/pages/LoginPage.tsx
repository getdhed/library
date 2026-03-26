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

const loginHighlights = [
  {
    label: "Каталог и поиск",
    value: "Быстрый доступ к PDF, истории запросов и карточкам документов.",
  },
  {
    label: "Модерация файлов",
    value: "Статусы отправленных PDF и решения администратора в одном месте.",
  },
  {
    label: "Единая тема",
    value: "Material UI в светлой и тёмной теме с сохранением текущей палитры.",
  },
];

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@library.local");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState("");

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await auth.login({ email, password });
      navigate("/");
    } catch {
      setError("Не удалось войти. Проверьте логин и пароль.");
    }
  }

  return (
    <AuthPageFrame
      heroBadge="Material Green UI"
      heroEyebrow="Вход в библиотеку"
      heroTitle="Личный кабинет каталога PDF в новом интерфейсе"
      heroDescription="Более заметный Material-style дизайн с зелёным акцентом, мягкими поверхностями и тёмно-зелёной ночной темой."
      highlights={loginHighlights}
      formContent={
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <Stack spacing={0}>
            <Chip
              label="Аккаунт"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ width: "fit-content" }}
            />
            <Typography variant="caption" sx={[eyebrowSx, { display: "block", mt: 1.2 }] }>
              Авторизация
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.8 }}>
              Вход в аккаунт
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Для локального администратора по умолчанию используются
              <strong> admin@library.local / admin12345</strong>.
            </Typography>
          </Stack>

          <TextField
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@library.local"
            fullWidth
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            type="password"
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button type="submit" variant="contained" size="large">
            Войти
          </Button>

          <Typography color="text.secondary">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </Typography>
        </Stack>
      }
    />
  );
};

export default LoginPage;
