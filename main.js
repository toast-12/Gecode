import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "./generative-ai.js";
import Base64 from './base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

// Initialize DOM elements
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
imageInput.addEventListener('change', (event) => {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onloadend = () => {
      previewImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

// Toggle advanced options visibility
moreOptionsBtn.addEventListener('click', () => {
  advancedOptionsDiv.style.display = advancedOptionsDiv.style.display === 'none' ? 'block' : 'none';
});

// Handle form submission
form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
    // Validate image file selection
    let imageFile = imageInput.files[0];
    if (!imageFile) {
      throw new Error('Please upload an image file.');
    }

    // Convert image to base64
    let reader = new FileReader();
    reader.onloadend = async () => {
      let imageBase64 = reader.result.split(',')[1]; // Extract base64 part

      // Prepare prompt text
      let language = languageSelect.value;
      let additionalInstructions = additionalInstructionsInput.value.trim();
      let promptText = `Express the components in the image as code in ${language}.`;
      if (additionalInstructions) {
        promptText += ` Additional instructions: ${additionalInstructions}`;
      }
      promptInput.value = promptText;

      // Prepare the content to send to the model
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
      const genAI = new GoogleGenerativeAI(); // Initialize without API key (use environment variable or other secure method)
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // Adjust model as needed
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      // Call the model and get the results
      const result = await model.generateContentStream({ contents });

      // Process and display the results
      let buffer = [];
      let md = new MarkdownIt();
      for await (let response of result.stream) {
        buffer.push(response.text());
        output.innerHTML = md.render(buffer.join(''));
      }
    };
    reader.readAsDataURL(imageFile);
  } catch (e) {
    output.innerHTML = `<hr>Error: ${e.message}`;
  }
};

// Display API key banner if necessary
maybeShowApiKeyBanner();

// Handle copy button click
document.getElementById('copyButton').addEventListener('click', () => {
  const outputText = output.innerText;

  // Create a temporary textarea element for copying text
  const textarea = document.createElement('textarea');
  textarea.value = outputText;
  document.body.appendChild(textarea);

  // Select and copy the text
  textarea.select();
  document.execCommand('copy');

  // Clean up and notify user
  document.body.removeChild(textarea);
  alert('Copied to clipboard!');
});
