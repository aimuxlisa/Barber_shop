"use client";

import { useEffect, useState } from "react";

interface Barber {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  experienceYears: number;
}

export default function AdminBarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма добавления/редактирования
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [experienceYears, setExperienceYears] = useState(3);

  const fetchBarbers = () => {
    fetch("http://localhost:3001/api/v1/barbers")
      .then((res) => res.json())
      .then((data) => {
        setBarbers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setBio("");
    setPhotoUrl("");
    setExperienceYears(3);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, bio, photoUrl, experienceYears: Number(experienceYears) };

    if (editingId) {
      await fetch(`http://localhost:3001/api/v1/admin/barbers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("http://localhost:3001/api/v1/admin/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    fetchBarbers();
  };

  const handleEdit = (barber: Barber) => {
    setEditingId(barber.id);
    setName(barber.name);
    setBio(barber.bio);
    setPhotoUrl(barber.photoUrl);
    setExperienceYears(barber.experienceYears);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить мастера из базы данных?")) return;
    await fetch(`http://localhost:3001/api/v1/admin/barbers/${id}`, { method: "DELETE" });
    fetchBarbers();
  };

  return (
    <div>
      <h1>Управление барберами (Full CRUD)</h1>

      <form onSubmit={handleSave} style={{ background: "#1a1a1a", padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editingId ? "✏️ Редактировать профиль барбера" : "➕ Добавить нового барбера"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <input
            type="text"
            placeholder="Имя барбера"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="URL фотографии"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="Биография"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
          <input
            type="number"
            placeholder="Опыт (лет)"
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button type="submit" style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4 }}>
            {editingId ? "Сохранить изменения" : "Добавить барбера"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ padding: "8px 16px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4 }}>
              Отмена
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Загрузка барберов...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {barbers.map((b) => (
            <div key={b.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 16, background: "#181818" }}>
              <h3 style={{ marginTop: 4 }}>{b.name}</h3>
              <p style={{ color: "#aaa", fontSize: 14 }}>{b.bio}</p>
              <p style={{ fontSize: 14, marginTop: 8 }}>Опыт: <b>{b.experienceYears} лет</b></p>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(b)} style={{ padding: "4px 8px", background: "#d97706", color: "#fff", border: "none", borderRadius: 4 }}>
                  Изменить
                </button>
                <button onClick={() => handleDelete(b.id)} style={{ padding: "4px 8px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 4 }}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
