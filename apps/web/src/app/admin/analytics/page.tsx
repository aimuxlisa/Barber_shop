export default function AdminAnalyticsPage() {
  return (
    <div>
      <h1>Аналитика и показатели бизнеса</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
        <div style={{ padding: 20, background: "#1e1e1e", borderRadius: 8 }}>
          <h4>Выручка</h4>
          <h2 style={{ color: "#4caf50" }}>0 UZS</h2>
        </div>
        <div style={{ padding: 20, background: "#1e1e1e", borderRadius: 8 }}>
          <h4>Завершенные записи</h4>
          <h2>0</h2>
        </div>
        <div style={{ padding: 20, background: "#1e1e1e", borderRadius: 8 }}>
          <h4>Отмены и неявки</h4>
          <h2 style={{ color: "#f44336" }}>0</h2>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>Популярные услуги & Загрузка барберов</h3>
        <p style={{ color: "#aaa" }}>Идёт выборка аналитических данных...</p>
      </div>
    </div>
  );
}
