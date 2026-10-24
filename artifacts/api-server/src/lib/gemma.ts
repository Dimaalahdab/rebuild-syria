import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AnalyzeIssueResponse } from "@workspace/api-zod";

export const REQUESTED_GEMMA_MODEL = "gemma-4-26b-a4b-it";
const FALLBACK_GEMMA_MODEL = "gemma-4-31b-it";
const REQUEST_TIMEOUT_MS = 30_000;

let client: GoogleGenAI | undefined;
let cachedModel: string | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemma API key not configured. Add GEMINI_API_KEY in Replit Secrets.",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function safeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? message.split(apiKey).join("[REDACTED]") : message;
}

export async function discoverGemmaModel(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedModel) return cachedModel;
  const ai = getClient();
  const pager = await ai.models.list({
    config: { pageSize: 100, httpOptions: { timeout: REQUEST_TIMEOUT_MS } },
  });
  const availableModels: string[] = [];
  for await (const model of pager) {
    const name = model.name?.replace(/^models\//, "");
    if (name) availableModels.push(name);
  }

  if (availableModels.includes(REQUESTED_GEMMA_MODEL)) {
    cachedModel = REQUESTED_GEMMA_MODEL;
    return cachedModel;
  }
  if (availableModels.includes(FALLBACK_GEMMA_MODEL)) {
    cachedModel = FALLBACK_GEMMA_MODEL;
    return cachedModel;
  }

  const availableGemma4 = availableModels.filter((name) => name.startsWith("gemma-4-"));
  throw new Error(
    `Requested model ${REQUESTED_GEMMA_MODEL} is not available for this API key. Available Gemma 4 models: ${availableGemma4.join(", ") || "none"}.`,
  );
}

export async function verifyGemmaOnStartup(): Promise<string> {
  return discoverGemmaModel(true);
}

export async function testGemmaConnection(): Promise<{
  model: string;
  response: string;
}> {
  const model = await discoverGemmaModel(true);
  const response = await getClient().models.generateContent({
    model,
    contents:
      "أجب بكلمة عربية واحدة فقط: هل اتصال نموذج Gemma 4 يعمل؟",
    config: {
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemma returned an empty response.");
  return { model, response: text };
}

export async function analyzeIssue(
  image: Buffer,
  mimeType: string,
  description: string,
  city: string,
  neighborhood: string,
): Promise<{ model: string; analysis: unknown }> {
  const model = await discoverGemmaModel();
  const prompt = `حلّل صورة بلاغ مجتمعي في سوريا مع الوصف والموقع التاليين.
المدينة: ${city}
الحي: ${neighborhood}
وصف المبلّغ: ${description}

أعد كائن JSON واحداً فقط، من دون Markdown أو نص قبله أو بعده، وباللغة العربية لجميع النصوص الوصفية.
المفاتيح المطلوبة:
- category: قيمة واحدة بالإنجليزية من Waste, Roads, Lighting, Public spaces, Buildings, Other
- title: عنوان عربي موجز
- description: وصف عربي موجز لما يظهر في الصورة
- suggestedPriority: قيمة واحدة من low, medium, high
- safetyFlags: مصفوفة من ملاحظات السلامة بالعربية؛ استخدم مصفوفة فارغة إذا لم يظهر خطر واضح
- suggestedActions: مصفوفة إجراءات آمنة مقترحة بالعربية
- requiredSkills: مصفوفة مهارات مطلوبة بالعربية
- suggestedMaterials: مصفوفة مواد مقترحة بالعربية
- requiresProfessionalReview: قيمة true أو false

لا تصادق على المشروع ولا توصي بإرسال متطوعين إلى عمل خطر. اعتبر مخاطر الطرق، المباني المتضررة، الذخائر، الكهرباء، والإنشاءات أسباباً للمراجعة المهنية. هذه ملاحظات أولية وليست شهادة سلامة. لا تستنتج تفاصيل لا تظهر في الصورة.`;

  const response = await getClient().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: image.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    config: {
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      temperature: 0.2,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) throw new Error("Gemma returned an empty analysis.");
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  let decoded: unknown;
  try {
    decoded = JSON.parse(jsonText);
  } catch {
    throw new Error("Gemma returned malformed JSON. Please try again or report manually.");
  }

  const parsed = AnalyzeIssueResponse.safeParse({ model, analysis: decoded });
  if (!parsed.success) {
    throw new Error(
      `Gemma returned an invalid analysis: ${parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("; ")}`,
    );
  }

  const analysis = parsed.data.analysis;
  const dangerousCategory =
    analysis.category === "Roads" || analysis.category === "Buildings";
  const dangerousText = [
    ...analysis.safetyFlags,
    ...analysis.suggestedActions,
    analysis.description,
  ]
    .join(" ")
    .toLowerCase();
  const safetyKeywords = [
    "كهرب",
    "ذخائر",
    "متفجر",
    "انهيار",
    "إنشائي",
    "خطر",
    "خطير",
    "أسلاك",
    "كهرباء",
  ];
  if (
    dangerousCategory ||
    safetyKeywords.some((keyword) => dangerousText.includes(keyword))
  ) {
    analysis.requiresProfessionalReview = true;
  }

  return parsed.data;
}

export async function matchVolunteers(
  project: { city: string; title: string; requiredSkills: string[] },
  volunteers: Array<{ userId: string; city: string; skills: string[] }>,
): Promise<{ model: string; recommendations: Array<{ userId: string; reason: string }> }> {
  const model = await discoverGemmaModel();
  const prompt = `اقترح حتى ثلاثة متطوعين لمشروع مجتمعي آمن.
المشروع: ${project.title}
المدينة: ${project.city}
المهارات المطلوبة: ${project.requiredSkills.join("، ")}
قائمة المرشحين المسموح بها (معرّف، مدينة، مهارات فقط): ${JSON.stringify(volunteers)}

أعد JSON فقط بالشكل {"recommendations":[{"userId":"معرّف موجود في القائمة","reason":"سبب موجز بالعربية"}]}.
لا تذكر أسماء. لا تخترع معرّفات. لا تسجّل أي شخص في المشروع.`;
  const response = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      temperature: 0.2,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });
  const rawText = response.text?.trim();
  if (!rawText) throw new Error("Gemma returned an empty matching response.");
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const decoded: unknown = JSON.parse(jsonText);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("recommendations" in decoded) ||
    !Array.isArray(decoded.recommendations)
  ) {
    throw new Error("Gemma returned malformed volunteer recommendations.");
  }
  const allowedIds = new Set(volunteers.map((volunteer) => volunteer.userId));
  const recommendations = decoded.recommendations
    .filter(
      (item): item is { userId: string; reason: string } =>
        typeof item === "object" &&
        item !== null &&
        "userId" in item &&
        typeof item.userId === "string" &&
        allowedIds.has(item.userId) &&
        "reason" in item &&
        typeof item.reason === "string",
    )
    .slice(0, 3);
  return { model, recommendations };
}
