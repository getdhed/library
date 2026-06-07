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

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState("");

  if (auth.token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await auth.login({ username, password });
      navigate("/");
    } catch {
      setError("Не удалось войти. Проверьте логин и пароль.");
    }
  }

  return (
    <AuthPageFrame
      title="Вход"
      subtitle="Используйте вашу учетную запись библиотеки."
      formContent={
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            inputProps={{ maxLength: 30 }}
            fullWidth
          />

          <TextField
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            type="password"
            inputProps={{ maxLength: 30 }}
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
