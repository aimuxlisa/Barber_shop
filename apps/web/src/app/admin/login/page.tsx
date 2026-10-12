"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/v1/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      if (!res.ok) {
        throw new Error("Неверный логин или пароль");
      }

      router.push("/admin");
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24, border: "1px solid #333", borderRadius: 12 }}>
      <h2>Вход в панель администратора</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label>Логин:</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            required
          />
        </div>
        <div>
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            required
          />
        </div>
        <button type="submit" style={{ padding: 12, background: "#0070f3", color: "#fff", border: "none", borderRadius: 6 }}>
          Войти
        </button>
      </form>
    </div>
  );
}
