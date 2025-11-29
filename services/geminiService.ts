import { GoogleGenAI } from "@google/genai";
import { getOrders, getProducts, getFinancialStats } from '../utils/storage';

const apiKey = process.env.API_KEY || '';

export const analyzeSalesData = async (): Promise<string> => {
  if (!apiKey) return "API Key not configured.";

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Gather data context (now async)
    const [orders, products, stats] = await Promise.all([
      getOrders(),
      getProducts(),
      getFinancialStats()
    ]);

    // Simplify data for token efficiency
    const recentOrders = orders.slice(-20).map(o => ({
      date: o.date,
      total: o.totalAmount,
      status: o.status,
      customer: o.customerName
    }));

    const stockLow = products.filter(p => p.stock < 100).map(p => p.name);
    
    const prompt = `
      You are a senior sales analyst for Emad Co. Pharmaceutical.
      Analyze the following data and provide a concise strategic summary (max 3 bullet points) and 1 actionable recommendation.
      
      Financials:
      - Total Sales: ${stats.totalSales}
      - Collected: ${stats.totalCollected}
      - Cash with Rep: ${stats.repCashOnHand}
      - Transferred to HQ: ${stats.transferredToHQ}

      Inventory Alerts (Low Stock): ${stockLow.join(', ')}

      Recent 20 Orders Sample: ${JSON.stringify(recentOrders)}

      Output format: Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate analysis at this time.";
  }
};