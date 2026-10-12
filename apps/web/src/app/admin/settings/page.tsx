"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [minNoticeMin, setMinNoticeMin] = useState("60");
  const [bookingHorizonDays, setBookingHorizonDays] = useState("30");
  const [shopName, setShopName] = useState("Barbershop Premium");
  const [shopPhone, setShopPhone] = useState("+998 90 123 45 67");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3001/api/v1/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.min_notice_min) setMinNoticeMin(s.min_notice_min);
        if (s.booking_horizon_days) setBookingHorizonDays(s.booking_horizon_days);
        if (s.shop_name) setShopName(s.shop_name);
        if (s.shop_phone) setShopPhone(s.shop_phone);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load settings", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    await fetch("http://localhost:3001/api/v1/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          min_notice_min: minNoticeMin,
          booking_horizon_days: bookingHorizonDays,
          shop_name: shopName,
          shop_phone: shopPhone,
        },
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <h1>Настройки барбершопа и системы</h1>
      <p>Параметры бронирования, ограничений времени и контактной информации.</p>

      {loading ? (
        <p>Загрузка настроек из базы данных...</p>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: 600, background: "#1a1a1a", padding: 24, borderRadius: 8, marginTop: 24 }}>
          {saved && <p style={{ color: "#4caf50", marginBottom: 16 }}>✅ Настройки успешно сохранены в БД!</p>}
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Название барбершопа:</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "#fff", borderRadius: 4 }}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Контактный телефон:</label>
            <input
              type="text"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "#fff", borderRadius: 4 }}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Минимальное время до записи (в минутах):</label>
            <input
              type="number"
              value={minNoticeMin}
              onChange={(e) => setMinNoticeMin(e.target.value)}
              style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "#fff", borderRadius: 4 }}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Горизонт бронирования вперед (в днях):</label>
            <input
              type="number"
              value={bookingHorizonDays}
              onChange={(e) => setBookingHorizonDays(e.target.value)}
              style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", color: "#fff", borderRadius: 4 }}
              required
            />
          </div>

          <button type="submit" style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: "bold" }}>
            Сохранить настройки
          </button>
        </form>
      )}
    </div>
  );
}
