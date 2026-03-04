import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const backendResponse = await fetch(
    "https://orbis-nik-backend-864057882351.asia-south1.run.app/api/ask",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await backendResponse.json();

  // Convert full response to stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const text = JSON.stringify(data, null, 2);

      for (let i = 0; i < text.length; i++) {
        controller.enqueue(encoder.encode(text[i]));
        await new Promise((r) => setTimeout(r, 5)); // typing speed
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}