import express from 'express';
import * as expenseController from '../controllers/expenseController';

const router = express.Router();

router.post('/', expenseController.createExpense);
router.get('/', expenseController.listExpenses);
router.post('/analyze', expenseController.analyzeText);
router.get('/expenses/total/:monthKey', getMonthlyTotal);
export default router;