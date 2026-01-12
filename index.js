import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({path: "./.env.local"});

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





app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    console.log("📥 Gelen dosya:", req.file);

    const filePath = req.file.path;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "gpt-4o-transcribe",
    });

    // geçici dosyayı sil
    fs.unlinkSync(filePath);

    res.json({ text: transcription.text });
  } catch (error) {
    console.error("❌ Transcribe error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
