export function normalizeAmount(amount) {
  // ZATEN number ise DOKUNMA
  if (typeof amount === "number" && !isNaN(amount)) {
    return Number(amount.toFixed(2));
  }

  // string ise: sadece virgül / nokta normalize et
  if (typeof amount === "string") {
    const cleaned = amount
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
  }

  return 0;
}
