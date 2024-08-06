import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "./node_modules/@google/generative-ai";
import Base64 from './base64-js';
import MarkdownIt from './markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import '/style.css';

// 🔥🔥 FILL THIS OUT FIRST! 🔥🔥
// Get your Gemini API key by:
// - Selecting "Add Gemini API" in the "Project IDX" panel in the sidebar
// - Or by visiting https://g.co/ai/idxGetGeminiKey
let API_KEY = 'AIzaSyBt4-KPEwmHT0sMzEN8d3wQ7sJIcH5QjBI';

let form = document.querySelector('form');
let promptInput = document.getElementById('promptInput');
let output = document.querySelector('.output');
let imageInput = document.getElementById('imageInput');
let previewImage = document.getElementById('previewImage');
let languageSelect = document.getElementById('languageSelect');
let moreOptionsBtn = document.getElementById('moreOptionsBtn');
let advancedOptionsDiv = document.getElementById('advancedOptions');
let additionalInstructionsInput = document.getElementById('additionalInstructionsInput');

// Update the image preview when a file is selected
imageInput.addEventListener('change', async (event) => {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onloadend = () => {
      previewImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

// Show or hide advanced options
moreOptionsBtn.addEventListener('click', () => {
  if (advancedOptionsDiv.style.display === 'none') {
    advancedOptionsDiv.style.display = 'block';
  } else {
    advancedOptionsDiv.style.display = 'none';
  }
});

// Handle form submission
form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
    // Convert the selected image file to base64
    let imageFile = imageInput.files[0];
    if (!imageFile) {
      throw new Error('Please upload an image file.');
    }
    
    let reader = new FileReader();
    reader.onloadend = async () => {
      let imageBase64 = reader.result.split(',')[1]; // Extract base64 part

      // Update the prompt based on the selected language
      let language = languageSelect.value;
      let additionalInstructions = additionalInstructionsInput.value.trim();
      let promptText = `Express the components in the image as code in ${language}.`;
      if (additionalInstructions) {
        promptText += ` Additional instructions: ${additionalInstructions}`;
      }
      promptInput.value = promptText;

      // Assemble the prompt by combining the text with the chosen image
      let contents = [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: imageFile.type, data: imageBase64 } },
            { text: promptInput.value }
          ]
        }
      ];

      // Initialize the generative model
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // or gemini-1.5-pro
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      // Call the multimodal model, and get a stream of results
      const result = await model.generateContentStream({ contents });

      // Read from the stream and interpret the output as markdown
      let buffer = [];
      let md = new MarkdownIt();
      for await (let response of result.stream) {
        buffer.push(response.text());
        output.innerHTML = md.render(buffer.join(''));
      }
    };
    reader.readAsDataURL(imageFile);
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

// Display the API key banner if needed
maybeShowApiKeyBanner(API_KEY);

document.getElementById('copyButton').addEventListener('click', function() {
  // Assuming the text to copy is inside the output element
  const outputText = document.querySelector('.output').innerText;
  
  // Create a temporary textarea element to use for copying
  const textarea = document.createElement('textarea');
  textarea.value = outputText;
  document.body.appendChild(textarea);
  
  // Select and copy the text
  textarea.select();
  document.execCommand('copy');
  
  // Remove the temporary textarea
  document.body.removeChild(textarea);
  
  // Optionally, provide user feedback
  alert('Copied to clipboard!');
});

