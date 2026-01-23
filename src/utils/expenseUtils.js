
import { CATEGORY_MAP } from "../config/categories.js";
import { resolveDate } from './dateUtils.js';
import { normalizeAmount } from './numberUtils.js';

export function findMatchingCategory(aiCategory) {
  if (!aiCategory) return "Diğer";
  
  const lowerAiCategory = aiCategory.toLowerCase('tr-TR');
  
  // First, check if the category exists as a key in CATEGORY_MAP
  if (CATEGORY_MAP.hasOwnProperty(lowerAiCategory)) {
    return lowerAiCategory.charAt(0).toUpperCase() + lowerAiCategory.slice(1);
  }
  
  // If not, check if it's in any of the value arrays
  for (const [category, aliases] of Object.entries(CATEGORY_MAP)) {
    if (aliases.some(alias => 
      lowerAiCategory.includes(alias.toLowerCase('tr-TR')) || 
      alias.toLowerCase('tr-TR').includes(lowerAiCategory)
    )) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  
  // If we get here, it's a new category
  // Add it to the map with the category name as its own alias
  const newCategory = lowerAiCategory;
  CATEGORY_MAP[newCategory] = [newCategory];
  console.log(`🌟 Yeni kategori eklendi: ${newCategory}`);
  
  return newCategory.charAt(0).toUpperCase() + newCategory.slice(1);
}

export function getFormattedCategory(category) {
  if (!category) return "Diğer";
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

// In your normalizeExpense function, update the category handling:
export function normalizeExpense(raw) {
  // Get the AI's category suggestion
  const aiCategory = raw.category || "Diğer";
  
  // Find matching category or create a new one
  const category = findMatchingCategory(aiCategory);

   // Format the amount
  const amount = normalizeAmount(raw.amount);
  
 // Format the amount with thousand separators
  const formattedAmount = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount) + ' TL';
  // Create description with formatted amount
  // Sadece sayısal değerleri çıkarıp, onun yerine biçimlendirilmiş hali koyuyoruz
  const description = raw.description 
  ? `${formattedAmount} - ${raw.description
      .replace(/[\d.,]+\s*TL?/gi, '')  // Sadece sayısal ifadeleri kaldır
      .replace(/\s+/g, ' ')  // Çoklu boşlukları tek boşluğa düşür
      .trim()}`.replace(/\s-\s*$/, '')  // Sondaki gereksiz tire ve boşlukları kaldır
  : formattedAmount;
  return {
    date: resolveDate(raw.dateText),
    category: getFormattedCategory(category),
    amount: amount,
    currency: "TRY",
    paymentMethod: ["cash", "credit_card", "debit_card"].includes(raw.paymentMethod)
      ? raw.paymentMethod
      : "cash",
    description: description,
    type: "expense",
  };
}
