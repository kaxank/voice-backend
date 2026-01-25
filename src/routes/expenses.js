import express from 'express';
import * as expenseController from '../controllers/expenseController.js';
import { createExpenseFromAudio } from '../controllers/voiceRecordController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .wav
    cb(null, Date.now() + ext);
  },
});


const upload = multer({ storage });
//USED ROUTES
router.post('/transcribe', upload.single('audio'), createExpenseFromAudio);

//UNUSED ROUTES
router.post('/', expenseController.createExpense);
router.get('/', expenseController.listExpenses);
router.post('/analyze', expenseController.analyzeText);
router.get('/monthly-total/:monthKey', expenseController.getMonthlyTotal);

export default router;