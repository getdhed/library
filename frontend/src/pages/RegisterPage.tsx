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

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
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
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Имя (как к вам обращаться)"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ваше имя"
            inputProps={{ maxLength: 30 }}
            fullWidth
          />

          <TextField
            label="Логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Придумайте логин"
            inputProps={{ maxLength: 30 }}
            fullWidth
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Создайте пароль"
            type="password"
            inputProps={{ maxLength: 30 }}
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
