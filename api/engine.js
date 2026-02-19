import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // LOG 1: Check if the request even hits the backend
  console.log('DEBUG: POST Request received at /api/generate');

  try {
    const { image } = await req.json();
    const apiKey = process.env.GOOGLE_API_KEY;

    // LOG 2: Check API Key
    if (!apiKey) {
      console.error('ERROR: GOOGLE_API_KEY missing in .env.local');
      return NextResponse.json(
        { error: 'Missing GOOGLE_API_KEY. Restart terminal.' },
        { status: 500 }
      );
    }

    const systemPrompt =
      'Role: Expert Architectural Drafting Engine. Objective: Transform the image into a clean 2D blueprint. White background, black lines only. Remove noise.';

    // LOG 3: Contact Google
    console.log('DEBUG: Calling Gemini API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { inlineData: { mimeType: 'image/png', data: image } },
              ],
            },
          ],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('GOOGLE API ERROR:', data.error.message);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const outputImage = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    )?.inlineData?.data;

    if (!outputImage) {
      return NextResponse.json(
        { error: 'No image returned from AI.' },
        { status: 500 }
      );
    }

    console.log('DEBUG: Successfully generated image.');
    return NextResponse.json({ image: outputImage });
  } catch (err: any) {
    console.error('BACKEND CRASH:', err);
    return NextResponse.json(
      { error: 'Backend Crash: ' + err.message },
      { status: 500 }
    );
  }
}
