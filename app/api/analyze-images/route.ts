import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images = [] as ImageInput[] } = body;

    if (!images || images.length === 0) {
      return NextResponse.json({ success: true, summary: null });
    }

    // Build vision content
    const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
    
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${img.mediaType};base64,${img.base64}` }
      });
    }

    content.push({
      type: "text",
      text: `Analyze these product images and describe:
1. Product type and model
2. Key visual features
3. Installation components shown
4. Packaging/accessories visible
5. Any text/labels readable

Keep response under 200 tokens. Be specific and technical.`
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: "user", content }],
    });

    const summary = response.choices[0]?.message?.content || "";

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Image analysis error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
