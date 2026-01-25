/*
User uploads an audio file to /transcribe endpoint in index.js
The audio is sent to OpenAI for transcription
The transcribed text is passed to analyzeExpense in aiService.js
analyzeExpense processes the text and returns structured expense data
The route handler in index.js then saves this data and sends a response
In summary:

index.js handles the voice/audio part
aiService.js handles the text analysis part
The flow is: Voice → (index.js) → Text → (aiService.js) → Structured Data
*/
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import { openai } from './src/config/openai.js';
import { analyzeExpense } from './src/services/aiService.js';
import { saveExpense } from './src/services/expenseService.js';
import { calculateMonthlyTotal } from './src/services/expenseService.js';
import { getMonthKey } from './src/utils/index.js';
import { normalizeExpense } from './src/utils/index.js';

const app = express();
app.use(cors());

getMonthKey
//normalizeAmount

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .wav
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

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

    //analyzeExpense() fonksiyonu text parametresini kullanarak harcama verisini analiz ediyor
    const rawExpense = await analyzeExpense(text);
    
    //normalizeExpense() --> resolveDate() dateText parametresini kullanarak tarihi çözümlüyor
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
