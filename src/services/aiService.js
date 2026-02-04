import { openai } from '../config/openai.js';

// ==============================
// CURRENCY DETECTOR (AI INDEPENDENT)
// ==============================
function detectCurrency(text) {
  const lower = text.toLowerCase();

  if (lower.includes('€') || lower.includes('euro') || lower.includes('eur')) {
    return 'EUR';
  }

  if (
    lower.includes('$') ||
    lower.includes('dolar') ||
    lower.includes('usd') ||
    lower.includes('amerikan doları')
  ) {
    return 'USD';
  }

  if (
    lower.includes('₺') ||
    lower.includes('tl') ||
    lower.includes('lira') ||
    lower.includes('try')
  ) {
    return 'TRY';
  }

  return 'TRY';
}


// ==============================
// TURKISH NUMBER PARSER (FINAL)
// ==============================

const numberWords = {
  'sıfır': 0,
  'bir': 1,
  'iki': 2,
  'üç': 3,
  'dört': 4,
  'beş': 5,
  'altı': 6,
  'yedi': 7,
  'sekiz': 8,
  'dokuz': 9,

  'on': 10,
  'yirmi': 20,
  'otuz': 30,
  'kırk': 40,
  'elli': 50,
  'altmış': 60,
  'yetmiş': 70,
  'seksen': 80,
  'doksan': 90,

  'yüz': 100,
  'bin': 1000,
  'milyon': 1000000
};

function parseWordsToNumber(words) {
  let total = 0;
  let current = 0;

  for (const word of words) {
    const value = numberWords[word];
    if (value === undefined) continue;

    if (value < 100) {
      current += value;
    } else if (value === 100) {
      current = current === 0 ? 100 : current * 100;
    } else {
      total += (current === 0 ? 1 : current) * value;
      current = 0;
    }
  }

  return total + current;
}

function normalizeNumber(str) {
  // hem nokta hem virgül → TR format
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }

  // sadece nokta
  if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3) {
      return parseFloat(str.replace(/\./g, ''));
    }
    return parseFloat(str);
  }

  // sadece virgül
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'));
  }

  return parseFloat(str);
}

export function parseTurkishNumber(text) {
  const lower = text.toLowerCase();

  // 1️⃣ TL + KURUŞ (yazıyla)
  if (lower.includes('kuruş')) {
    const tlPart = lower.match(/(.+?)\s*tl/);
    const kurusPart = lower.match(/(.+?)\s*kuruş/);

    const tl = tlPart ? parseTurkishNumber(tlPart[1]) : 0;
    const kurus = kurusPart ? parseTurkishNumber(kurusPart[1]) : 0;

    return Number((tl + kurus / 100).toFixed(2));
  }

  // 2️⃣ YAZIYLA ONDALIK (nokta / virgül)
  if (lower.includes('nokta') || lower.includes('virgül')) {
    const splitter = lower.includes('nokta') ? 'nokta' : 'virgül';
    const [left, right] = lower.split(splitter);

    const whole = parseWordsToNumber(
      left.replace(/[^a-zğüşıöç\s]/gi, '').split(/\s+/)
    );

    const decimal = parseWordsToNumber(
      right.replace(/[^a-zğüşıöç\s]/gi, '').split(/\s+/)
    );

    return Number(`${whole}.${decimal.toString().padStart(2, '0')}`);
  }

  // 3️⃣ RAKAM + TL (+ opsiyonel ,kuruş)
  const tlMatch = lower.match(
    /(\d[\d.,]*)(?:\s*(?:tl|₺|try))(?:\s*,\s*(\d{1,2}))?/
  );

  if (tlMatch) {
    const whole = normalizeNumber(tlMatch[1]);
    const decimal = tlMatch[2] ? parseInt(tlMatch[2], 10) / 100 : 0;
    return Number((whole + decimal).toFixed(2));
  }

  // 4️⃣ RAKAMLI ONDALIK
  const decimalMatch = lower.match(/(\d[\d.,]*[.,]\d+)/);
  if (decimalMatch) {
    return Number(normalizeNumber(decimalMatch[1]).toFixed(2));
  }

  // 5️⃣ SADE RAKAM
  const plainNumber = lower.match(/\b\d+\b/);
  if (plainNumber) {
    return Number(parseInt(plainNumber[0], 10).toFixed(2));
  }

  // 6️⃣ TAMAMEN YAZIYLA
  const words = lower
    .replace(/[^a-zğüşıöç\s]/gi, '')
    .split(/\s+/);

  return Number(parseWordsToNumber(words).toFixed(2));
}


export const analyzeExpense = async (text) => {
  console.log("📝 Analiz ediliyor:", text);
  
  // Sayıyı çıkar
  const amount = parseTurkishNumber(text);
  const currency = detectCurrency(text);

  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
            You are a highly attentive personal finance assistant.

            Your task is to extract structured expense data from user text that comes from speech-to-text transcription.
            The transcription may be informal, incomplete, or imperfect.

            The numeric amount has ALREADY been extracted from the text as: ${amount}
            The currency has ALREADY been detected from the text as: ${currency}
            DO NOT extract or calculate any other amount from the text.
            The amount ${amount} has been professionally parsed from Turkish number words.
            DO NOT override this value under any circumstances.

            CRITICAL RULE:
            - You MUST use this exact amount value.
            - You are NOT allowed to calculate, infer, or modify the amount.
            - Do NOT extract numbers from the text.
            - amount is READ-ONLY and MUST be ${amount}
            - currency is READ-ONLY and MUST be ${currency}
            - You are NOT allowed to infer, extract, or modify amount or currency

            Your tasks:
            - Determine category
            - Determine payment method
            - Determine currency
            - Extract dateText if present
            - Copy full original text into description
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
            - amount: The numeric amount has ALREADY been extracted from the text as: ${amount}
            - currency: (TRY, EUR, USD) 
            - payment method: (cash, credit_card, debit_card)
            - description: (the full original text the user provided)
            
            IMPORTANT RULES:

            1. Always try to determine a category.
            2. Never leave "category" as null unless it is absolutely impossible.
            3. If the category is not explicitly mentioned, infer it from context.
            4. If nothing matches perfectly, create a new category and add it to the list above.

            amount:  The numeric value already extracted as ${amount} from the text.
              CRITICAL: You MUST use exactly ${amount} as the amount. Do not extract or calculate any other amount from the text.
              The amount ${amount} has been professionally parsed from Turkish number words.
              DO NOT override this value under any circumstances.
            
            - Example 1: For "12 Mart 2025, kuzenlerle evde yemek malzeme alımı 1490.70 TL", amount should be exactly 1490.70
            - Example 2: For "1.490,70 TL market alışverişi", amount should be exactly 1490.70
            - Example 3: For "28 Mart 2025 yemek yedim kredi kartı 1200 TL", amount should be 1200
            - Example 4: For "1400 TL 28 Mart 2025 Yemek Yedim", amount should be 1400
            - currency: "TRY", "EUR", "USD" 
            - if no currency is found, use "TRY"
            - the number combination before the currency should be used as the amount
            

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
              "amount": ${amount},
              "currency": "${currency}",
              "paymentMethod": "cash | credit_card | debit_card",
              "description": "string",
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