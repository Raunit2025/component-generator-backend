// services/aiService.js
const axios = require('axios');
const prettier = require('prettier');

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const logError = (error, responseData = null) => {
    console.error('--- AI Service Error ---');
    if (error.isAxiosError && error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message || error);
      if (responseData) {
        console.error('Response Data:', JSON.stringify(responseData, null, 2));
      }
    }
    console.error('--------------------------');
}

const convertJsxObjectToString = (node) => {
    if (typeof node === 'string') return node;
    if (!node || typeof node !== 'object' || !node.type || node.type !== 'element') return '';
    const tagName = node.name || 'div';
    const attrs = node.attrs ? Object.entries(node.attrs)
        .filter(([key]) => !/^[A-Z]/.test(key))
        .map(([key, value]) => `${key}="${value}"`).join(' ') : '';
    const children = node.children ? node.children.map(convertJsxObjectToString).join('') : '';
    const selfClosingTags = ['input', 'br', 'hr', 'img', 'meta', 'link'];
    if (selfClosingTags.includes(tagName) && !children) return `<${tagName} ${attrs} />`;
    return `<${tagName} ${attrs}>${children}</${tagName}>`;
};

const formatCode = async (code, parser) => {
    try {
        return await prettier.format(code, {
            parser: parser,
            semi: true,
            singleQuote: true,
            trailingComma: 'es5',
            bracketSpacing: true,
            jsxSingleQuote: false,
        });
    } catch (error) {
        console.error(`Prettier formatting failed for ${parser}:`, error.message);
        return code;
    }
};

const generateComponentCode = async (prompt, existingJsx = '', existingCss = '', targetElement = null) => {
    const systemPrompt = `
      You are an expert React code editor. Your job is to modify existing code based on a user's request.
      You MUST return a single, valid JSON object with two keys: "jsxCode" and "cssCode". Do not wrap your response in markdown backticks.

      **CRITICAL CSS STRATEGY:**
      Your primary goal is to separate styles from structure.
      - IF the user asks for a component that is more than a single element (e.g., a 'form', 'card', 'page', 'dashboard'), you MUST convert all styling (including Tailwind classes) into traditional CSS in the "cssCode" field.
      - The "jsxCode" should then ONLY contain simple, semantic class names using the "className" attribute.
      - EXAMPLE for a login form:
        - jsxCode: '<div className="login-container"><form>...</form></div>'
        - cssCode: '.login-container { display: flex; align-items: center; ... }'
      - ONLY for extremely simple, single-element requests (e.g., "a single red button") MAY you use Tailwind classes directly in the JSX. For all other multi-element components, you MUST separate the CSS.

      **Editing Modes:**
      1.  **General Edit:** If no "targetElement" is provided, modify the entire component.
      2.  **Targeted Edit:** If a "targetElement" is provided, apply changes ONLY to that specific element, which is identified by its \`data-id\` attribute.

      **General Rules:**
      - "jsxCode" must be ONLY the JSX for the component's body.
      - The JSX must have a single root element or fragment (<>...</>).
      - PRESERVE existing \`data-id\` attributes.
    `;

    let fullPrompt;
    if (targetElement && targetElement.elementId) {
        fullPrompt = `
          The user has selected a specific element to modify.
          Target Element: <${targetElement.tagName.toLowerCase()}> with the attribute data-id="${targetElement.elementId}".

          Here is the current code:
          JSX/TSX:
          \`\`\`jsx
          ${existingJsx}
          \`\`\`

          CSS:
          \`\`\`css
          ${existingCss}
          \`\`\`

          Please apply the following change ONLY to the targeted element: "${prompt}"
        `;
    } else {
        fullPrompt = `
          Here is the current code:
          JSX/TSX:
          \`\`\`jsx
          ${existingJsx}
          \`\`\`

          CSS:
          \`\`\`css
          ${existingCss}
          \`\`\`

          Please apply the following change: "${prompt}"
        `;
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: fullPrompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
      }
    };

    let lastError = null;
    for (let i = 0; i < 3; i++) {
        try {
            const response = await axios.post(API_URL, payload, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.data.candidates || !response.data.candidates[0].content.parts[0].text) {
                logError(new Error("Invalid response structure from Gemini API"), response.data);
                throw new Error('AI returned an invalid response structure.');
            }

            const content = response.data.candidates[0].content.parts[0].text;
            let parsedContent = JSON.parse(content);

            if (typeof parsedContent.jsxCode === 'object' && parsedContent.jsxCode !== null) {
                if (Array.isArray(parsedContent.jsxCode)) {
                    parsedContent.jsxCode = parsedContent.jsxCode.map(convertJsxObjectToString).join('');
                } else {
                    parsedContent.jsxCode = convertJsxObjectToString(parsedContent.jsxCode);
                }
            }

            if (typeof parsedContent.jsxCode !== 'string') {
                logError(new Error(`AI response did not contain a valid jsxCode string`), parsedContent);
                parsedContent.jsxCode = `<div style={{color: 'orange', padding: '1rem', border: '1px solid orange', borderRadius: '8px', fontFamily: 'sans-serif'}}>Sorry, the AI returned an invalid response. Please try rephrasing your prompt.</div>`;
                parsedContent.cssCode = '';
            }

            let jsxSnippet = parsedContent.jsxCode.trim();
            const returnMatch = jsxSnippet.match(/^return\s*\(([\s\S]*?)\);?$/);
            if (returnMatch) {
                jsxSnippet = returnMatch[1];
            }

            jsxSnippet = jsxSnippet.trim();


            if (!jsxSnippet || !jsxSnippet.startsWith('<')) {
                logError(new Error(`AI returned invalid JSX: "${jsxSnippet}"`));
                jsxSnippet = `<div style={{color: 'orange', padding: '1rem', border: '1px solid orange', borderRadius: '8px', fontFamily: 'sans-serif'}}>Sorry, the AI returned invalid code. Please try rephrasing your prompt.</div>`;
            }

            const componentWrapper = `const GeneratedComponent = () => {\n  return (\n    ${jsxSnippet}\n  );\n};`;

            const formattedJsx = await formatCode(componentWrapper, 'babel');
            const formattedCss = await formatCode(parsedContent.cssCode || '', 'css');

            return {
                jsxCode: formattedJsx,
                cssCode: formattedCss,
            };
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${i + 1} failed. Retrying in ${Math.pow(2, i)} seconds...`);
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
        }
    }

    logError(lastError);
    throw new Error('Failed to generate component code from AI after multiple retries.');
}

module.exports = { generateComponentCode };