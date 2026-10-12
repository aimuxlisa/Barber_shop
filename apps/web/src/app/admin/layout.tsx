import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, background: "#111", padding: 20, color: "#fff" }}>
        <h3>Панель управления</h3>
        <nav style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
          <Link href="/admin" style={{ color: "#aaa", textDecoration: "none" }}>📅 Записи</Link>
          <Link href="/admin/services" style={{ color: "#aaa", textDecoration: "none" }}>✂️ Услуги (CRUD)</Link>
          <Link href="/admin/barbers" style={{ color: "#aaa", textDecoration: "none" }}>💈 Барберы (CRUD)</Link>
          <Link href="/admin/schedule" style={{ color: "#aaa", textDecoration: "none" }}>🕒 График и обеды</Link>
          <Link href="/admin/analytics" style={{ color: "#aaa", textDecoration: "none" }}>📊 Аналитика</Link>
          <Link href="/admin/reviews" style={{ color: "#aaa", textDecoration: "none" }}>⭐ Отзывы</Link>
          <Link href="/admin/settings" style={{ color: "#aaa", textDecoration: "none" }}>⚙️ Настройки</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}
