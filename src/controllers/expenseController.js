import * as expenseService from '../services/expenseService.js';
import * as aiService from '../services/aiService.js';


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

/*
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

//bu fonksiyonu kullanmadık. api call yok toplam voiceRecordController'da hesaplanıyor
export const getMonthlyTotalByCurrency = async (req, res) => {
  try {
    const { monthKey } = req.params;
    const totals = await expenseService.calculateMonthlyTotalByCurrency(monthKey);

      // voiceRecordController'deki gibi detaylı loglar
    console.log("📅 Month key:", monthKey);
    console.log("💰 Para birimine göre aylık toplamlar:", totals);
    
    // Her para birimini ayrı ayrı logla
    Object.entries(totals).forEach(([currency, total]) => {
      console.log(`💰 ${monthKey} ${currency} toplamı:`, total);
    });
    res.json({ totals });
    console.log("📊 Para birimine göre aylık toplamlar:", totals);
  } catch (error) {
    console.error('❌ Para birimine göre aylık toplam alınırken hata:', error);
    res.status(500).json({ error: 'Para birimine göre aylık toplam hesaplanamadı' });
  }
};

*/