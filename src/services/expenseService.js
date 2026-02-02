import { supabase } from '../config/supabase.js';

// Dosyanın en üstüne bu fonksiyonu ekle
const getMonthEndDate = (year, month) => {
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  return `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
};

export const saveExpense = async (expense) => {
  // Veritabanına uygun formata dönüştür
  const dbExpense = {
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency,
    payment_method: expense.paymentMethod, // Veritabanındaki sütun adına dikkat edin
    description: expense.description || null,
    created_at: new Date().toISOString()
  };

  console.log("📝 Veritabanına kaydediliyor:", dbExpense);
    const { data, error } = await supabase
      .from('expenses')
      .insert([dbExpense])
      .select();

    if (error) {
      console.error('❌ Veritabanı hatası:', error);
      return { error };
    }

    console.log('✅ Başarıyla kaydedildi:', data);
    return { data };
  }

export const getExpenses = async (month, year) => {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = getMonthEndDate(year, month);
 
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('❌ Veri çekme hatası:', error);
      return { error };
    }
  
    console.log('📊 Veriler başarıyla çekildi:');
    return { data };
}

export const calculateMonthlyTotal = async (monthKey) => {
  const [year, month] = monthKey.split('-');
  const { data, error } = await getExpenses(month, year);
  if (error) {
    console.error('❌ Aylık toplam hesaplanırken hata:', error);
    throw error; // Hata durumunda hatayı fırlatıyoruz
  }
  const total = data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  console.log(`💰 ${monthKey} toplam harcama:`, total);
  return total;
};
  