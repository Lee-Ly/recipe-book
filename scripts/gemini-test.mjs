import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key || key.startsWith('PASTE')) throw new Error('No key in .env.local');

const base = 'https://generativelanguage.googleapis.com/v1beta';

async function pickModel() {
  const res = await fetch(`${base}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  if (!res.ok) throw new Error(`List models failed: ${res.status} ${await res.text()}`);
  const { models } = await res.json();
  const names = models
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''))
    .filter(n => /flash/.test(n) && !/(lite|image|tts|live|audio|preview|exp|thinking)/.test(n));
  names.sort().reverse();
  return process.env.MODEL || names[0];
}

const recipeText = readFileSync(new URL('./sample-recipe.txt', import.meta.url), 'utf8');

const prompt = `You extract recipes into structured JSON.
Rules:
- Keep the recipe's original language (Hebrew stays Hebrew, English stays English) for title, ingredients, steps, tags and category. Do not translate.
- Every ingredient: keep original amount text, plus cups (number or null), grams (number or null), ml (number or null). Convert using the ingredient's real density (1 cup = 240 ml). Mark converted values with converted=true.
- Temperatures in Celsius. Convert Fahrenheit. Note "fan" if mentioned.
- Suggest 3-8 short tags in the recipe language, and 1-3 categories from: cookies, cake, bread, dairy, vegan, dessert, main, soup, salad, breakfast, snack (use the Hebrew equivalent for Hebrew recipes).
- Do not invent ingredients or steps that are not in the text.

Recipe text:
${recipeText}`;

const schema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    language: { type: 'STRING' },
    ingredients: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      name: { type: 'STRING' }, original: { type: 'STRING' },
      cups: { type: 'NUMBER', nullable: true }, grams: { type: 'NUMBER', nullable: true },
      ml: { type: 'NUMBER', nullable: true }, converted: { type: 'BOOLEAN' } },
      required: ['name', 'original', 'converted'] } },
    steps: { type: 'ARRAY', items: { type: 'STRING' } },
    ovenCelsius: { type: 'NUMBER', nullable: true },
    totalMinutes: { type: 'NUMBER', nullable: true },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    categories: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'language', 'ingredients', 'steps', 'tags', 'categories'],
};

const model = await pickModel();
console.error(`Using model: ${model}`);
const res = await fetch(`${base}/models/${model}:generateContent`, {
  method: 'POST',
  headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1 },
  }),
});
if (!res.ok) throw new Error(`Generate failed: ${res.status} ${await res.text()}`);
const data = await res.json();
const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
console.log(JSON.stringify(JSON.parse(raw), null, 2));
