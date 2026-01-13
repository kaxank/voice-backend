import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({path: "./.env.local"});

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
You are a personal finance assistant.
Your job is to extract structured expense data from user text.

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
  "category": string | null,
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


/*
Bu fonksiyon:
Büyük/küçük harf düzeltir
"300 TL" → 300
Yanlış ödeme tipini fallback eder
Eksik alanları doldurur
*/
function normalizeExpense(raw) {
  return {
    date: resolveDate(raw.dateText),
    category:
      typeof raw.category === "string" && raw.category.length > 0
        ? raw.category.charAt(0).toUpperCase() + raw.category.slice(1)
        : "Diğer",

    amount:
      typeof raw.amount === "number"
        ? raw.amount
        : Number(String(raw.amount).replace(/[^\d]/g, "")) || 0,

    currency: "TRY",

    paymentMethod: ["cash", "credit_card", "debit_card"].includes(
      raw.paymentMethod
    )
      ? raw.paymentMethod
      : "cash",

    description:
      typeof raw.description === "string" ? raw.description : "",

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
