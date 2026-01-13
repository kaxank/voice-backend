import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({path: "./.env.local"});


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

// 🧾 Geçici muhasebe defteri (RAM'de tutulur)
const expenseStore = {
  // "2026-01": [ { expense }, { expense } ]
};
getMonthKey
normalizeAmount
saveExpense
calculateMonthlyTotal

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

function saveExpense(expense) {
  const monthKey = getMonthKey(expense.date);

  if (!expenseStore[monthKey]) {
    expenseStore[monthKey] = [];
  }

  expenseStore[monthKey].push(expense);
}

function calculateMonthlyTotal(monthKey) {
  const expenses = expenseStore[monthKey] || [];
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}



const app = express();
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .wav
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

async function analyzeExpense(text) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
            You are a highly attentive personal finance assistant.

            Your task is to extract structured expense data from user text that comes from speech-to-text transcription.
            The transcription may be informal, incomplete, or imperfect.

            IMPORTANT RULES:

            1. Always try to determine a category.
            2. Never leave "category" as null unless it is absolutely impossible.
            3. If the category is not explicitly mentioned, infer it from context.

            Categories:
            - grocery (food, market, vegetables, supermarket, pazardan, manav)
            - transport (taxi, uber, bus, metro, ulaşım, yol, benzin)
            - bill (electricity, water, internet, phone, kira, fatura)
            - entertainment (netflix, spotify, sinema, oyun, eğlence)
            - dining (restaurant, cafe, yemek, kahve)
            - shopping (clothes, electronics, alışveriş)
            - health (pharmacy, doctor, hastane, ilaç)
            - rent (rent, kira)
            - education (kurs, okul, eğitim)

            7. If nothing matches perfectly, create a new category and add it to the list above.


            If the user mentions a date (like "today", "yesterday", "tomorrow", "12 January", "12/01/2026"),
            extract it as a string field called "dateText".
            If no date is mentioned, set "dateText" to null.


            Return ONLY valid JSON.
            Do not explain anything.
            Do not use markdown.
            Do not add extra text.

            Schema:
            {
            "dateText": string | null,
            "category": string,
            "amount": number | null,
            "currency": "TRY",
            "paymentMethod": "cash" | "credit_card" | "debit_card" | null,
            "description": string | null,
            "type": "expense"
            }
        `,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0,
  });
  const aiResponse = JSON.parse(response.choices[0].message.content);
  console.log("🤖 AI'dan gelen kategori:", aiResponse.category); 
  return JSON.parse(response.choices[0].message.content);
}

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
  
  return {
    date: resolveDate(raw.dateText),
    category: getFormattedCategory(category),
    amount: typeof raw.amount === "number" 
      ? raw.amount 
      : Number(String(raw.amount).replace(/[^\d]/g, "")) || 0,
    currency: "TRY",
    paymentMethod: ["cash", "credit_card", "debit_card"].includes(raw.paymentMethod)
      ? raw.paymentMethod
      : "cash",
    description: typeof raw.description === "string" ? raw.description : "",
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

    saveExpense(expense);
    const monthKey = getMonthKey(expense.date);
    console.log("📅 Month key:", monthKey);
    const monthlyTotal = calculateMonthlyTotal(monthKey);
    console.log("📊 Monthly total:", monthlyTotal);
    console.log("📊 STANDARD_CATEGORIES:", CATEGORY_MAP);
    


    


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
