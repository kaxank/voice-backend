import { openai } from '../config/openai.js';


// Sayı sözlüğünü düzenleyelim
const numberWords = {
  'sıfır': 0, 'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5,
  'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10,
  'yirmi': 20, 'otuz': 30, 'kırk': 40, 'elli': 50,
  'altmış': 60, 'yetmiş': 70, 'seksen': 80, 'doksan': 90,
  'yüz': 100, 'bin': 1000, 'milyon': 1000000
};
function parseTurkishNumber(text) {
  // First, try to find a number with decimal part followed by TL (with . or , as decimal separator)
  const decimalTlMatch = text.match(/(\d[\d,]*[.,]\d+)\s*TL/i);
  if (decimalTlMatch) {
    const numStr = decimalTlMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }
  
  // Then try to find a whole number followed by TL
  const wholeTlMatch = text.match(/(\d[\d,]*)\s*TL/i);
  if (wholeTlMatch) {
    const numStr = wholeTlMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }
  
  // If no TL is found, look for any number with decimal part
  const decimalMatch = text.match(/(\d[\d,]*[.,]\d+)/);
  if (decimalMatch) {
    const numStr = decimalMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }
  
  // If no decimal number is found, look for any whole number
  const numberMatch = text.match(/(\d[\d,]*)/);
  if (numberMatch) {
    const numStr = numberMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }

  // Rest of the function remains the same...
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

            amount: The numeric value that appears with the currency (TL) in the text.
            IMPORTANT: 
            Always use the number that appears right before "TL" in the text.
            - Always use the exact number that appears right before "TL" in the text, including decimal points.
            - Preserve all decimal places (e.g., "1490.70 TL" should be 1490.70, not 1490).
            - If the amount uses comma as decimal separator (e.g., "1.490,70 TL"), convert it to use a decimal point (1490.70).
            - NEVER round or truncate decimal values.
            - Example 1: For "12 Mart 2025, kuzenlerle evde yemek malzeme alımı 1490.70 TL", amount should be exactly 1490.70
            - Example 2: For "1.490,70 TL market alışverişi", amount should be exactly 1490.70
            - Example 3: For "28 Mart 2025 yemek yedim kredi kartı 1200 TL", amount should be 1200
            - Example 4: For "1400 TL 28 Mart 2025 Yemek Yedim", amount should be 1400
            - NEVER use the day number from the date as the amount
            - If no amount is found with TL, only then use the first number you find
            - currency: Always "TRY" (Turkish Lira)



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