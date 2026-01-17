// src/config/openai.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});