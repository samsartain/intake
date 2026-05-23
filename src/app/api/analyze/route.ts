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
    const { image, mediaType, type, query } = await request.json();

    let prompt = '';
    if (type === 'search') {
      prompt = `A user typed a description of food or drink they consumed: "${query}".
Estimate the nutrition for what they described.

Method:
1. If they name a restaurant or packaged brand (e.g. McDonald's, Chipotle, a labeled product), use that brand's known published nutrition for the size described.
2. If a quantity or size is given, use it. If not, assume one typical serving and reflect that in the item name.
3. Treat distinct foods as separate items (e.g. "burger and fries" → two items).
4. Be realistic; err slightly high on calorie-dense items (oils, cheese, bread, nut butters, dressings, sauces).
5. For generic/home-cooked items only, keep them internally consistent: calories should be approximately 4*protein + 4*carbs + 9*fat (within ~15%). For brand/restaurant items, prefer the brand's actual published numbers even if they don't perfectly match this formula.

For each item set "branded" to true ONLY when it is from an identifiable restaurant or packaged brand and you are reporting that brand's published nutrition; otherwise false.

Round protein, carbs, and fat to whole grams, and calories to the nearest 5. In each item's name, include the brand and size when known.

Respond with ONLY a JSON object — no prose, no markdown fences:
{"items":[{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"branded":boolean}]}

If the text does not describe any food or drink, respond exactly with: {"items":[]}`;
    } else if (type === 'food') {
      prompt = `You are a careful nutrition estimator. Identify every distinct food and drink item in this image and estimate the nutrition for the portion ACTUALLY visible.

Method:
1. If an item is from an identifiable restaurant or packaged brand (e.g. McDonald's, Chipotle, a labeled product), use that brand's known published nutrition for the size shown, then scale to the visible portion.
2. For generic or home-cooked food, estimate the real visible portion (not a generic "serving size"). Judge size using the plate, utensils, hands, or packaging for scale.
3. Be realistic; err slightly high on calorie-dense items (oils, cheese, bread, nut butters, dressings, sauces).
4. For generic/home-cooked items only, keep them internally consistent: calories should be approximately 4*protein + 4*carbs + 9*fat (within ~15%). For brand/restaurant items, prefer the brand's actual published numbers even if they don't perfectly match this formula.

For each item set "branded" to true ONLY when it is from an identifiable restaurant or packaged brand and you are reporting that brand's published nutrition; otherwise false.

Round protein, carbs, and fat to whole grams, and calories to the nearest 5. In each item's name, include the brand and size when known.

Respond with ONLY a JSON object — no prose, no markdown fences:
{"items":[{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"branded":boolean}]}

If no food is visible, respond exactly with: {"items":[]}`;
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

    // Text search has no image; photo/workout types include the image.
    const content: any[] =
      type === 'search'
        ? [{ type: 'text', text: prompt }]
        : [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt },
          ];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: 'user', content }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text response' }, { status: 500 });
    }
    // Robust extraction: strip code fences, then take the outermost {...} block
    let raw = textBlock.text.replace(/```json|```/g, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      raw = raw.slice(start, end + 1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Could not parse model response', raw: textBlock.text.slice(0, 500) },
        { status: 502 }
      );
    }

    // Calorie sanity check for food: snap calories to the 4/4/9 macro total
    // when the model's stated calories diverge by more than 25%.
    if ((type === 'food' || type === 'search') && Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((it: any) => {
        const p = Number(it.protein) || 0;
        const c = Number(it.carbs) || 0;
        const f = Number(it.fat) || 0;
        const cal = Number(it.calories) || 0;
        const fromMacros = 4 * p + 4 * c + 9 * f;
        // Skip the 4/4/9 snap for branded items: trust the brand's published
        // numbers, which legitimately diverge from the macro formula (fiber,
        // sugar alcohols, label rounding). Still snap if calories are missing.
        if (it.branded && cal > 0) {
          return it;
        }
        if (fromMacros > 0 && (cal === 0 || Math.abs(cal - fromMacros) / fromMacros > 0.25)) {
          return { ...it, calories: Math.round(fromMacros / 5) * 5 };
        }
        return it;
      });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
