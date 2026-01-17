import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import { supabase } from './src/config/supabase.js';
import { openai } from './src/config/openai.js';
import { analyzeExpense } from './src/services/aiService.js';
import { saveExpense } from './src/services/expenseService.js';
import { calculateMonthlyTotal } from './src/services/expenseService.js';


const app = express();
app.use(cors());


const CATEGORY_MAP = {
  grocery: ["grocery", "market", "pazardan", "manav", "sebze", "meyve"],
  transport: ["transport", "taxi", "uber", "ulaşım", "otobüs", "metro", "benzin"],
  bill: ["bill", "fatura", "elektrik", "su", "internet", "telefon"],
  entertainment: ["entertainment", "netflix", "spotify", "sinema", "oyun", "eğlence"],
  dining: ["dining", "restaurant", "cafe", "kahve", "yemek"],
  shopping: ["shopping", "alışveriş", "kıyafet", "elektronik"],
  health: ["health", "eczane", "ilaç", "doktor", "hastane"],
  rent: ["rent", "kira"],
  education: ["education", "kurs", "okul", "eğitim"]
};


getMonthKey
normalizeAmount

// 📅 Ay anahtarı oluşturur
// 2026-01-12 → 2026-01
function getMonthKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

function normalizeAmount(amount) {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    return Number(amount.replace(/[^\d]/g, ""));
  }
  return 0;
}


const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .wav
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });


function resolveDate(dateText) {
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


function findMatchingCategory(aiCategory) {
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

function getFormattedCategory(category) {
  if (!category) return "Diğer";
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}


// In your normalizeExpense function, update the category handling:
function normalizeExpense(raw) {
  // Get the AI's category suggestion
  const aiCategory = raw.category || "Diğer";
  
  // Find matching category or create a new one
  const category = findMatchingCategory(aiCategory);

   // Format the amount
  const amount = typeof raw.amount === "number" 
    ? raw.amount 
    : Number(String(raw.amount).replace(/[^\d]/g, "")) || 0;
  
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

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    console.log("📥 Gelen dosya:", req.file);

    const filePath = req.file.path;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "gpt-4o-transcribe",
    });
    console.log("✅ Transcribe başarılı:", transcription.text);

    const text = transcription.text;

    const rawExpense = await analyzeExpense(text);
    const expense = normalizeExpense(rawExpense);
    console.log("📊 Raw expense:", rawExpense);
    console.log("📊 Normalized expense:", expense);

    const { error } = await saveExpense(expense);
    if (error) {
      console.error('❌ Hata oluştu:', error);
    }

    const monthKey = getMonthKey(expense.date);
    console.log("📅 Month key:", monthKey);
    
    const monthlyTotal = await calculateMonthlyTotal(monthKey);
    console.log("💰 Aylık toplam harcama:", monthlyTotal);
    
    // geçici dosyayı sil
    fs.unlinkSync(filePath);

    res.json({
        transcript: text,
        expense,
        monthKey,
        monthlyTotal,
    });
  } catch (error) {
    console.error("❌ Transcribe error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
