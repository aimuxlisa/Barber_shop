"use client";

import { useEffect, useState } from "react";

interface Booking {
  id: string;
  startsAt: string;
  status: string;
  totalPrice: number;
  client: { name: string; phone: string };
  barber: { name: string };
}

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/api/v1/admin/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load bookings from API", err);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>Управление записями барбершопа</h1>
      <p>Бронирования загружены напрямую из нашей базы данных Supabase/PostgreSQL.</p>

      <div style={{ marginTop: 24, padding: 16, border: "1px solid #333", borderRadius: 8 }}>
        <h3>Список бронирований из БД</h3>
        {loading ? (
          <p>Загрузка данных из БД...</p>
        ) : bookings.length === 0 ? (
          <p style={{ color: "#aaa" }}>В базе данных пока нет созданных записей.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #444", textTransform: "uppercase", fontSize: 12, color: "#888" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Дата / Время</th>
                <th style={{ padding: 8, textAlign: "left" }}>Клиент</th>
                <th style={{ padding: 8, textAlign: "left" }}>Барбер</th>
                <th style={{ padding: 8, textAlign: "left" }}>Сумма</th>
                <th style={{ padding: 8, textAlign: "left" }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 8 }}>{new Date(b.startsAt).toLocaleString("ru-RU")}</td>
                  <td style={{ padding: 8 }}>{b.client.name} ({b.client.phone})</td>
                  <td style={{ padding: 8 }}>{b.barber.name}</td>
                  <td style={{ padding: 8 }}>{b.totalPrice} UZS</td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: b.status === "confirmed" ? "#1e3a8a" : b.status === "completed" ? "#14532d" : "#7f1d1d"
                    }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
