import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export async function parseDiscountRule(userInput) {
  const prompt = `
You are an API that returns STRICT JSON only.

Never include markdown.
Never explain.
Never wrap the response in code fences.
Return exactly one JSON object.

Convert the user's discount rule into STRICT JSON.

Return ONLY JSON.

Supported schema:

{
  "scope": "brand | platform | cart",
  "appliesTo": "",
  "type": "percentage | flat",
  "value": number,
  "stackable": boolean,
  "minCartValue": number | null
}

Rules:

Brand Example:
20% off Natura Casa

↓

{
"scope":"brand",
"appliesTo":"Natura Casa",
"type":"percentage",
"value":20,
"stackable":true,
"minCartValue":null
}

Platform Example:

Rs.100 off Amazon India

↓

{
"scope":"platform",
"appliesTo":"Amazon India",
"type":"flat",
"value":100,
"stackable":false,
"minCartValue":null
}

Cart Example:

10% off if cart exceeds Rs.5000

↓

{
"scope":"cart",
"appliesTo":"",
"type":"percentage",
"value":10,
"stackable":false,
"minCartValue":5000
}

If information is missing, return

{
"error":"Unable to determine complete rule."
}

User:

${userInput}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text.trim();

  // Remove markdown fences
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Find first JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return valid JSON.");
  }

  const json = cleaned.substring(start, end + 1);
  const rule = JSON.parse(json);

  const validScopes = ["brand", "platform", "cart"];
  const validTypes = ["percentage", "flat"];

  if (rule.error) {
    return rule;
  }

  if (!validScopes.includes(rule.scope)) {
    throw new Error("Invalid scope returned by Gemini.");
  }

  if (!validTypes.includes(rule.type)) {
    throw new Error("Invalid discount type returned by Gemini.");
  }

  if (typeof rule.value !== "number") {
    throw new Error("Discount value must be numeric.");
  }

  if (typeof rule.stackable !== "boolean") {
    throw new Error("Stackable must be true or false.");
  }

  return rule;
}

export async function parseCartItems(text) {
  const prompt = `
You are an API that extracts shopping cart items.

Return STRICT JSON ONLY.

Never explain.
Never use markdown.
Never wrap the response in code fences.

Return an array.

Schema:

[
  {
    "itemId":"ITEM-01",
    "product":"Cushion Cover",
    "brand":"Natura Casa",
    "platform":"Amazon India",
    "basePrice":1299
  }
]

Rules:

- Infer missing ITEM IDs sequentially.
- basePrice must be numeric.
- Remove commas and currency symbols.
- Ignore:

- Invoice number
- Order number
- Dates
- Headers
- Column names
- Empty rows
- Totals
- Summary text

Extract ONLY actual cart items.

Every returned object must represent one purchasable product.

If extraction fails return

{
  "error":"Unable to extract cart items."
}

Cart Text:

${text}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const raw = response.text.trim();

  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1) {
    throw new Error("Gemini returned invalid cart JSON.");
  }

  const items = JSON.parse(cleaned.substring(start, end + 1));

  const required = ["itemId", "product", "brand", "platform", "basePrice"];

  for (const item of items) {
    for (const field of required) {
      if (!(field in item)) {
        throw new Error(`Missing '${field}' in parsed cart.`);
      }
    }

    if (typeof item.basePrice !== "number") {
      throw new Error("Invalid base price.");
    }
  }

  if (!Array.isArray(items)) throw new Error("Expected array.");

  return items;
}