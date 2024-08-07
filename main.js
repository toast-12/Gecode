import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from './generative-ai.js';
import MarkdownIt from './markdown-it.js';
import { maybeShowApiKeyBanner } from './gemini-api-banner.js';
import './style.css';

// Initialize DOM elements
const form = document.querySelector('form');
const promptInput = document.getElementById('promptInput');
const output = document.querySelector('.output');
const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const languageSelect = document.getElementById('languageSelect');
const moreOptionsBtn = document.getElementById('moreOptionsBtn');
const advancedOptionsDiv = document.getElementById('advancedOptions');
const additionalInstructionsInput = document.getElementById('additionalInstructionsInput');

// Update the image preview when a file is selected
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
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
        const imageFile = imageInput.files[0];
        if (!imageFile) {
            throw new Error('Please upload an image file.');
        }

        // Convert image to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageBase64 = reader.result.split(',')[1]; // Extract base64 part

            // Prepare prompt text
            const language = languageSelect.value;
            const additionalInstructions = additionalInstructionsInput.value.trim();
            let promptText = `Express the components in the image as code in ${language}.`;
            if (additionalInstructions) {
                promptText += ` Additional instructions: ${additionalInstructions}`;
            }
            promptInput.value = promptText;

            // Prepare the content to send to the model
            const contents = [
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
            const md = new MarkdownIt();
            for await (const response of result.stream) {
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
