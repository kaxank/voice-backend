// 📅 Ay anahtarı oluşturur
// 2026-01-12 → 2026-01
export function getMonthKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

export function resolveDate(dateText) {
  const today = new Date();

  if (!dateText) {
    return today.toISOString().split("T")[0];
  }

  const text = dateText.toLowerCase();

  if (text.includes("today") || text.includes("bugün")) {
    return today.toISOString().split("T")[0];
  }

  if (text.includes("yesterday") || text.includes("dün")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }

  if (text.includes("tomorrow") || text.includes("yarın")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // AI tarih formatı verdiyse (örnek: 2026-01-12)
  const parsed = new Date(dateText);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  // fallback
  return today.toISOString().split("T")[0];
}
