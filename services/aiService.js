// services/aiService.js
const axios = require('axios');
const prettier = require('prettier');

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;


console.log("API KEY LENGTH:", process.env.GEMINI_API_KEY?.length);

const logError = (error) => {
  console.error('--- AI Service Error ---');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.error('Error:', error.message);
  }
  console.error('--------------------------');
};

const formatCode = async (code, parser) => {
  try {
    return await prettier.format(code, {
      parser,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      bracketSpacing: true,
    });
  } catch (error) {
    console.error(`Prettier formatting failed for ${parser}:`, error.message);
    return code;
  }
};

const extractJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("AI did not return valid JSON.");
  }
};

const generateComponentCode = async (
  prompt,
  existingJsx = '',
  existingCss = '',
  targetElement = null
) => {

  const systemPrompt = `
You are an expert React code editor.

Return ONLY a valid JSON object:
{
  "jsxCode": "...",
  "cssCode": "..."
}

No markdown. No explanations.

Rules:
- JSX must have single root.
- Preserve data-id attributes.
- Separate CSS for multi-element components.
`;

  const fullPrompt = `
Current JSX:
${existingJsx}

Current CSS:
${existingCss}

User request:
${prompt}
`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt + "\n\n" + fullPrompt
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("Invalid Gemini response structure.");
    }

    const parsed = extractJson(aiText);

    let jsxSnippet = parsed.jsxCode?.trim();
    let cssSnippet = parsed.cssCode || '';

    if (!jsxSnippet || !jsxSnippet.startsWith('<')) {
      throw new Error("Invalid JSX returned by AI.");
    }

    const componentWrapper = `
const GeneratedComponent = () => {
  return (
    ${jsxSnippet}
  );
};
`;

    const formattedJsx = await formatCode(componentWrapper, 'babel');
    const formattedCss = await formatCode(cssSnippet, 'css');

    return {
      jsxCode: formattedJsx,
      cssCode: formattedCss
    };

  } catch (error) {
    logError(error);
    throw new Error('Failed to generate component code from AI.');
  }
};

module.exports = { generateComponentCode };
