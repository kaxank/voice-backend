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
import cors from "cors";
import expensesRouter from './src/routes/expenses.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Make uploads directory accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Use the expenses router
app.use('/api', expensesRouter);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});
//app.post("/transcribe", upload.single("audio"), createExpenseFromAudio);

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
