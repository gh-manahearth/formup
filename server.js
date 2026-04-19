const express = require("express");
const Anthropic = require("@anthropic-ai/sdk").default;
const path = require("path");

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic()
  : null;

const PARSE_PROMPT = `You are a form-parsing assistant. The user will give you the text of a form (or a description of form fields). Your job is to extract every question or field the user needs to fill out.

Rules:
- Extract each field as a separate question.
- Simplify the language. Replace jargon with plain English.
  - "Legal name as it appears on government-issued identification" → "What is your full legal name?"
  - "Date of birth (MM/DD/YYYY)" → "What is your date of birth?"
  - "Describe the nature of your condition" → "Can you describe what's going on with your health?"
- Keep questions short and clear — one sentence max.
- Preserve the order from the original form.
- If a field has options (checkboxes, dropdowns), include them as choices.
- For sections/headers in the form, include them as context but mark them as section headers.
- Do NOT skip any fields, even simple ones like name and date.
- Do NOT add questions that aren't in the original form.

Respond with ONLY a JSON array. Each item should have:
- "id": a sequential number starting at 1
- "question": the simplified question
- "original": the original field text from the form (brief)
- "type": one of "text", "long_text", "date", "choice", "yes_no"
- "choices": array of options (only for "choice" type, omit otherwise)
- "section": section header if this starts a new section (omit if no section change)

No other text. Just the JSON array.`;

app.post("/api/parse", async (req, res) => {
  const { formText } = req.body;

  if (!formText || !formText.trim()) {
    return res.status(400).json({ error: "No form text provided" });
  }

  if (!anthropic) {
    return res.json({
      questions: [
        { id: 1, question: "What is your full name?", original: "Full Name", type: "text" },
        { id: 2, question: "What is your date of birth?", original: "DOB (MM/DD/YYYY)", type: "date" },
        { id: 3, question: "What is your address?", original: "Mailing Address", type: "text" },
      ],
      demo: true,
    });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: PARSE_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the form to parse:\n\n${formText}`,
        },
      ],
    });

    const raw = message.content[0].text;
    const questions = JSON.parse(raw);
    res.json({ questions });
  } catch (err) {
    console.error("Parse error:", err.message);
    res.status(500).json({ error: "Couldn't read that form. Try pasting the text differently." });
  }
});

const FORMAT_PROMPT = `You are a form-filling assistant. The user answered a series of form questions. Your job is to format their answers so they can copy them back into the original form.

Rules:
- Match the answers to the original form fields.
- Format answers appropriately (dates in standard format, proper capitalization for names, etc.).
- Clean up spoken/casual answers into proper form responses.
  - "yeah" → "Yes"
  - "like maybe three times a week" → "3 times per week"
  - "um its at 123 main street in phoenix" → "123 Main Street, Phoenix"
- Keep answers concise and form-appropriate.
- Number each answer to match the form field order.
- Group by section if sections exist.

Respond with ONLY the formatted answers, numbered and ready to copy. No commentary, no explanations. Just the answers.`;

app.post("/api/format", async (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "No answers provided" });
  }

  if (!anthropic) {
    const formatted = answers
      .map((a) => `${a.id}. ${a.original}: ${a.answer}`)
      .join("\n");
    return res.json({ formatted, demo: true });
  }

  try {
    const answerText = answers
      .map((a) => `Field: "${a.original}"\nQuestion asked: "${a.question}"\nUser's answer: "${a.answer}"`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: FORMAT_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are the user's answers to format:\n\n${answerText}`,
        },
      ],
    });

    res.json({ formatted: message.content[0].text });
  } catch (err) {
    console.error("Format error:", err.message);
    res.status(500).json({ error: "Couldn't format answers. Please try again." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`FormUp running at http://localhost:${PORT}`);
});
