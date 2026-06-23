import React, { useState } from "react";
import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthPageFrame from "../components/AuthPageFrame";

const RegisterPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ fullName: "", username: "", password: "" });

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const newFieldErrors = { fullName: "", username: "", password: "" };
    let hasError = false;

    if (!fullName.trim()) {
      newFieldErrors.fullName = "Имя обязательно для заполнения";
      hasError = true;
    }
    if (!username.trim()) {
      newFieldErrors.username = "Логин обязателен для заполнения";
      hasError = true;
    }
    if (!password) {
      newFieldErrors.password = "Пароль обязателен для заполнения";
      hasError = true;
    } else if (password.length < 6) {
      newFieldErrors.password = "Пароль должен содержать минимум 6 символов";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setFieldErrors({ fullName: "", username: "", password: "" });

    try {
      await auth.register({ fullName, username, password });
      navigate("/");
    } catch {
      setError("Не удалось зарегистрироваться. Возможно, логин уже занят.");
    }
  }

  return (
    <AuthPageFrame
      title="Регистрация"
      formContent={
        <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Имя (как к вам обращаться)"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ваше имя"
            inputProps={{ maxLength: 30 }}
            error={!!fieldErrors.fullName}
            helperText={fieldErrors.fullName}
            fullWidth
          />

          <TextField
            label="Логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Придумайте логин"
            inputProps={{ maxLength: 30 }}
            error={!!fieldErrors.username}
            helperText={fieldErrors.username}
            fullWidth
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Создайте пароль"
            type="password"
            inputProps={{ maxLength: 30 }}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
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
