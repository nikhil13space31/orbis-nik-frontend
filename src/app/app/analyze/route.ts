import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendResponse = await fetch(
      "https://orbis-nik-backend-864057882351.asia-south1.run.app/api/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    // If Cloud Run fails (container error, timeout, etc.), catch it here
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("Cloud Run Error:", errorText);
      return NextResponse.json(
        { detail: "Backend server error. Check Cloud Run logs." },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
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
  } catch (error: any) {
    console.error("Next.js API Error:", error);
    return NextResponse.json(
      { detail: "Internal Server Error" },
      { status: 500 }
    );
  }
}