import * as expenseService from '../services/expenseService';
import * as aiService from '../services/aiService';

export const createExpense = async (req, res) => {
  try {
    const expense = req.body;
    const result = await expenseService.saveExpense(expense);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listExpenses = async (req, res) => {
  try {
    const { month, year } = req.query;
    const expenses = await expenseService.getExpenses(month, year);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const analyzeText = async (req, res) => {
  try {
    const { text } = req.body;
    const analysis = await aiService.analyzeExpense(text);
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getMonthlyTotal = async (req, res) => {
  try {
    const { monthKey } = req.params;
    const total = await expenseService.calculateMonthlyTotal(monthKey);
    res.json({ total });
    console.log("📊getMonthlyTotal()-expenseController.js Aylık toplam:", total);
  } catch (error) {
    console.error('❌ Aylık toplam alınırken hata:', error);
    res.status(500).json({ error: 'Aylık toplam hesaplanamadı' });
  }
};