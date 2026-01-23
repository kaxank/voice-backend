import { openai } from '../config/openai.js';

// aiService.js dosyasındaki ilgili kısmı şu şekilde güncelleyin:
// Sayı sözlüğünü düzenleyelim
const numberWords = {
  'sıfır': 0, 'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5,
  'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10,
  'yirmi': 20, 'otuz': 30, 'kırk': 40, 'elli': 50,
  'altmış': 60, 'yetmiş': 70, 'seksen': 80, 'doksan': 90,
  'yüz': 100, 'bin': 1000, 'milyon': 1000000
};
function parseTurkishNumber(text) {
  // Önce metindeki sayısal ifadeleri kontrol et (örn: "1500 TL")
  const numberMatch = text.match(/(\d[\d.,]*)/);
  if (numberMatch) {
    const num = parseFloat(numberMatch[0].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num)) return num;
  }
  // Türkçe metin olarak işle
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '')
    .split(/\s+/)
    .filter(word => word in numberWords);
  let total = 0;
  let current = 0;
  for (const word of words) {
    const num = numberWords[word];
    
    if (num < 100) {
      current += num;
    } else if (num === 100) {
      current = current === 0 ? 100 : current * 100;
    } else if (num >= 1000) {
      total += (current === 0 ? 1 : current) * num;
      current = 0;
    }
  }
  return total + current;
}
export const analyzeExpense = async (text) => {
  console.log("📝 Analiz ediliyor:", text);
  
  // Sayıyı çıkar
  const amount = parseTurkishNumber(text);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
            You are a highly attentive personal finance assistant.

            Your task is to extract structured expense data from user text that comes from speech-to-text transcription.
            The transcription may be informal, incomplete, or imperfect.


            - date: if mentioned, otherwise use today's date
            - category: 
              -- grocery (food, market, vegetables, supermarket, pazardan, manav)
              -- transport (taxi, uber, bus, metro, ulaşım, yol, benzin)
              -- bill (electricity, water, internet, phone, kira, fatura)
              -- entertainment (netflix, spotify, sinema, oyun, eğlence, tatil, holiday)
              -- dining (restaurant, cafe, yemek, kahve)
              -- shopping (clothes, electronics, alışveriş)
              -- health (pharmacy, doctor, hastane, ilaç)
              -- rent (rent, kira)
              -- education (kurs, okul, eğitim)
            - amount (numeric value, already extracted as ${amount} from the text)
            - currency (TRY)
            - payment method (cash, credit_card, debit_card)
            - description (the full original text the user provided)
            
            IMPORTANT RULES:

            1. Always try to determine a category.
            2. Never leave "category" as null unless it is absolutely impossible.
            3. If the category is not explicitly mentioned, infer it from context.
            4. If nothing matches perfectly, create a new category and add it to the list above.



            If the user mentions a date (like "today", "yesterday", "tomorrow", "12 January", "12/01/2026"),
            extract it as a string field called "dateText".
            If no date is mentioned, set "dateText" to null.




            Return ONLY valid JSON.
            Do not explain anything.
            Do not use markdown.
            Do not add extra text.

            Schema:
            {
              "dateText": "string | null",
              "category": "string",
              "amount": ${amount || 'number'},  // Use the pre-extracted amount
              "currency": "TRY",
              "paymentMethod": "cash | credit_card | debit_card",
              "description": "string (original user input)",
              "type": "expense"
            }`
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0,
  });
  const aiResponse = JSON.parse(response.choices[0].message.content);
  console.log("🤖 AI'dan gelen yanıt:", aiResponse);
  console.log("🤖 AI'dan gelen kategori:", aiResponse.category); 
  // Ensure description contains the full original text
  if (aiResponse.description !== text) {
    aiResponse.description = text;
  }
  
  // Ensure amount is correctly set
  if (amount && !aiResponse.amount) {
    aiResponse.amount = amount;
  }
  
  return aiResponse;
}