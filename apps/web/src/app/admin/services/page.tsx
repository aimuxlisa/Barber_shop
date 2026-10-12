"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма добавления/редактирования
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(100000);

  const fetchServices = () => {
    fetch("http://localhost:3001/api/v1/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setDurationMin(30);
    setPrice(100000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, description, durationMin: Number(durationMin), price: Number(price) };

    if (editingId) {
      // Обновление (PUT)
      await fetch(`http://localhost:3001/api/v1/admin/services/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      // Добавление (POST)
      await fetch("http://localhost:3001/api/v1/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    fetchServices();
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description);
    setDurationMin(service.durationMin);
    setPrice(service.price);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту услугу?")) return;
    await fetch(`http://localhost:3001/api/v1/admin/services/${id}`, { method: "DELETE" });
    fetchServices();
  };

  return (
    <div>
      <h1>Управление услугами (Full CRUD)</h1>

      {/* Форма создания / изменения */}
      <form onSubmit={handleSave} style={{ background: "#1a1a1a", padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editingId ? "✏️ Редактировать услугу" : "➕ Добавить новую услугу"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <input
            type="text"
            placeholder="Название услуги"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
          <input
            type="number"
            placeholder="Длительность (мин)"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
          <input
            type="number"
            placeholder="Цена (UZS)"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            required
            style={{ padding: 8, background: "#222", border: "1px solid #444", color: "#fff" }}
          />
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button type="submit" style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4 }}>
            {editingId ? "Сохранить изменения" : "Создать услугу"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ padding: "8px 16px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4 }}>
              Отмена
            </button>
          )}
        </div>
      </form>

      {/* Таблица услуг */}
      {loading ? (
        <p>Загрузка услуг...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #444", textAlign: "left", color: "#888", fontSize: 13 }}>
              <th style={{ padding: 10 }}>Название</th>
              <th style={{ padding: 10 }}>Описание</th>
              <th style={{ padding: 10 }}>Мин</th>
              <th style={{ padding: 10 }}>Цена</th>
              <th style={{ padding: 10 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 10, fontWeight: "bold" }}>{s.name}</td>
                <td style={{ padding: 10, color: "#aaa" }}>{s.description}</td>
                <td style={{ padding: 10 }}>{s.durationMin}</td>
                <td style={{ padding: 10 }}>{s.price} UZS</td>
                <td style={{ padding: 10, display: "flex", gap: 8 }}>
                  <button onClick={() => handleEdit(s)} style={{ padding: "4px 8px", background: "#d97706", color: "#fff", border: "none", borderRadius: 4 }}>
                    Изменить
                  </button>
                  <button onClick={() => handleDelete(s.id)} style={{ padding: "4px 8px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 4 }}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
