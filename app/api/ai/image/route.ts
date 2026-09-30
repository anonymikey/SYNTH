import { NextResponse } from "next/server";
import { resolveSynthModelAsync } from "@/lib/ai/model-routing";
import { createClient } from "@/lib/supabase/server";

const MAX_PROMPT_LENGTH = 2000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to use SYNTH Vision." }, { status: 401 });

    const body = await request.json() as { prompt?: unknown; size?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return NextResponse.json({ error: "Enter a prompt up to 2,000 characters." }, { status: 400 });

    const selection = await resolveSynthModelAsync("synth-vision");
    if (selection.providerId !== "openai") return NextResponse.json({ error: "SYNTH Vision image generation is not configured with an image-capable primary route yet." }, { status: 503 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "SYNTH Vision is not configured on the server." }, { status: 503 });

    const response = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: selection.model, prompt, size: body.size === "1536x1024" || body.size === "1024x1536" ? body.size : "1024x1024", n: 1, response_format: "b64_json" }),
      cache: "no-store",
    });
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 502 : response.status === 429 ? 429 : response.status >= 500 ? 503 : 502;
      return NextResponse.json({ error: status === 429 ? "SYNTH Vision is temporarily rate limited." : "SYNTH Vision could not generate the image." }, { status });
    }
    const data = await response.json() as { data?: Array<{ b64_json?: string }> };
    const image = data.data?.[0]?.b64_json;
    if (!image) return NextResponse.json({ error: "SYNTH Vision returned no image." }, { status: 502 });
    return NextResponse.json({ model: "synth-vision", mimeType: "image/png", image: `data:image/png;base64,${image}` });
  } catch {
    return NextResponse.json({ error: "SYNTH Vision is temporarily unavailable." }, { status: 503 });
  }
}
