export function normalizeAmount(amount) {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    return Number(amount.replace(/[^\d]/g, ""));
  }
  return 0;
}