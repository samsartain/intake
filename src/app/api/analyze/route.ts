import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  // Require auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { image, mediaType, type } = await request.json();

    let prompt = '';
    if (type === 'food') {
      prompt = `Identify all food items in this image. Estimate the actual portion visible (not generic "serving sizes"). Be realistic. Err slightly higher on calorie-dense items like oils, cheese, bread, nut butters.

Respond ONLY with valid JSON, no markdown:
{
  "items": [
    {"name": "string", "calories": number, "protein": number, "carbs": number, "fat": number}
  ]
}

If no food visible: {"items": []}`;
    } else if (type === 'workout') {
      prompt = `This is a screenshot from Apple Watch, Apple Health, or a similar fitness tracker showing a workout summary. Extract the data.

Respond ONLY with valid JSON, no markdown:
{
  "type": "string (e.g. 'Traditional Strength Training', 'Cycling', 'Rowing', 'Running')",
  "duration_minutes": number,
  "calories": number (active calories if shown, else total),
  "avg_hr": number or null,
  "max_hr": number or null,
  "notes": "string with any other relevant detail visible"
}

If you can't identify a workout: {"type": "Unknown", "duration_minutes": 0, "calories": 0, "avg_hr": null, "max_hr": null, "notes": ""}`;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text response' }, { status: 500 });
    }
    const clean = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
