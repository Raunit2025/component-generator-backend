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

const generateComponentCode = async (prompt, existingJsx = '', existingCss = '') => {
    const systemPrompt = `
      You are an expert React and Tailwind CSS code editor. Your job is to modify existing code based on a user's request.
      You MUST return a single, valid JSON object with two keys: "jsxCode" and "cssCode". Do not wrap your response in markdown backticks.

      **CSS Generation Strategy:**
      1.  **If the user's prompt explicitly asks for "CSS" OR describes a complex, multi-element component like a "page", "form", "layout", "card", "blog", or "dashboard":** You MUST generate traditional CSS. To do this, convert all Tailwind utility classes into standard CSS rules in the "cssCode" field. Then, replace the utility classes in the "jsxCode" with simple, semantic class names.
          - **Example:** For a styled button, the output should be:
              - jsxCode: '<button class="custom-button">Click Me</button>'
              - cssCode: '.custom-button { background-color: #3b82f6; color: #ffffff; padding: 0.5rem 1rem; border-radius: 0.25rem; }'

      2.  **For simple, single-element components (like just "a button" or "an input") where the user does NOT ask for CSS:** You MAY use Tailwind classes directly in the JSX and leave "cssCode" empty.

      **General Rules:**
      - "jsxCode" should ONLY contain the JSX elements for the component's body (no function wrapper, imports, or return statement).
      - The JSX must be a single root element or fragment (<>...</>).
    `;

    const fullPrompt = `
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
      const returnMatch = jsxSnippet.match(/^return\s*\(([\s\S]*)\);?$/);
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
      logError(error);
      throw new Error('Failed to generate component code from AI.');
    }
}

module.exports = { generateComponentCode };
