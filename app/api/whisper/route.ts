import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `
你是一個餐飲點單語音文本校正器，負責把辨識出的中文語句轉成「餐點名稱 + 空格 + 數字金額 + （可選）空格 + 數字份數」的極簡格式。

規則：
1. 將中文數字（例如：一百二、五十、兩百三十、兩、三份、三杯）轉為阿拉伯數字。
2. 將全形數字轉為半形。
3. 移除金額相關的單位或停用字，如：塊、元、塊錢、塊錢喔、dollar、元整 等。
4. 份數為可選；如果有份數，請只保留「純數字」，並捨棄單位（份、杯、碗、個 等）。
5. 只保留一組「餐點文字 + 空格 + 數字金額 + （可選）空格 + 數字份數」，例如：
   - 「牛肉麵 120」
   - 「牛肉麵 120 2」
6. 若無法確定價格或沒有價格，請直接回傳原始文本，不要亂猜金額與份數。

輸出格式：
請只輸出 JSON，結構為：
{ "normalized": "牛肉麵 120" }
或（有份數時）：
{ "normalized": "牛肉麵 120 2" }
`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const input = body.text?.trim();

    if (!input) {
      return NextResponse.json(
        { error: "Missing text" },
        {
          status: 400,
        },
      );
    }

    // Heuristic 1: 如果一句話裡完全沒有任何「數字線索」，就不呼叫 LLM 以節省成本。
    // - ASCII 數字：0-9
    // - 常見中文數字符號：一二三四五六七八九零十百千萬億等
    // - 金額關鍵詞：塊、元、dollar…（避免包含中文數字但沒提金額的句子誤判）
    const hasAsciiDigit = /\d/.test(input);
    const hasChineseNumeric = /[一二三四五六七八九零〇十百千萬亿億两兩壹貳參肆伍陸柒捌玖拾佰仟]/.test(
      input,
    );

    if (!hasAsciiDigit && !hasChineseNumeric) {
      // 明顯沒有價格資訊，直接回傳原始文本，避免多餘的 OpenAI 呼叫
      return NextResponse.json({ normalized: input });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // 如果沒有設定 API key，就直接回傳原始文本
      return NextResponse.json({ normalized: input });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input },
          ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { normalized: input },
        {
          status: 200,
        },
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string | null };
      }>;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ normalized: input });
    }

    let normalized = input;
    try {
      const parsed = JSON.parse(content) as { normalized?: string };
      if (parsed.normalized && parsed.normalized.trim().length > 0) {
        normalized = parsed.normalized.trim();
      }
    } catch {
      // 如果解析失敗，就退回原始文本
      normalized = input;
    }

    return NextResponse.json({ normalized });
  } catch (error) {
    console.error("Whisper normalization error:", error);
    return NextResponse.json(
      { normalized: null },
      {
        status: 500,
      },
    );
  }
}


