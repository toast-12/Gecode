import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "/node_modules/.vite/deps/@google_generative-ai.js?v=56798126";
import __vite__cjsImport1_base64Js from "/node_modules/.vite/deps/base64-js.js?v=67fdc565"; const Base64 = __vite__cjsImport1_base64Js.__esModule ? __vite__cjsImport1_base64Js.default : __vite__cjsImport1_base64Js;
import __vite__cjsImport2_markdownIt from "/node_modules/.vite/deps/markdown-it.js?v=f4c11356"; const MarkdownIt = __vite__cjsImport2_markdownIt.__esModule ? __vite__cjsImport2_markdownIt.default : __vite__cjsImport2_markdownIt;
import { maybeShowApiKeyBanner } from "/gemini-api-banner.js";
import "/style.css?t=1722775764016";

let API_KEY = 'AIzaSyAV5Vrz5C7-uuYTQTBhIOtz3TBmEaKcgs8';

let form = document.querySelector('form');
let fileInput = document.querySelector('input[name="chosen-image"]');
let languageSelect = document.querySelector('select[name="language"]');
let output = document.querySelector('.output');
let imagePreview = document.querySelector('.image-preview');
let codePreview = document.querySelector('#code-preview code');
let copyBtn = document.querySelector('#copy-btn');

// Function to show error notification
function showErrorNotification(message) {
  let notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.innerHTML = `
    <p>${message}</p>
    <button onclick="this.parentElement.style.display='none'">Close</button>
  `;
  document.body.appendChild(notification);
}

// Function to handle repeated attempts
function handleRepeatedAttempts() {
  window.location.href = 'repeated-attempts.html';
}

form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
    let file = fileInput.files[0];
    if (!file) {
      throw new Error('No image file selected');
    }

    let imageBase64 = await new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = () => {
        let base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    let language = languageSelect.value;

    let contents = [
      {
        role: 'user',
        parts: [
          { text: `Please analyze this image and generate code in ${language} based on its content.` },
          { inline_data: { mime_type: file.type, data: imageBase64 } }
        ]
      }
    ];

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const result = await model.generateContentStream({ contents });

    let buffer = [];
    let md = new MarkdownIt();
    for await (let response of result.stream) {
      if (response.text().includes("blocked due to RECITATION")) {
        showErrorNotification("죄송하지만, 기업에서 사용하거나 다른 사람이 만든 디자인을 코드화 할 수 없습니다.");
        if (localStorage.getItem('attemptedImage') === file.name) {
          handleRepeatedAttempts();
        } else {
          localStorage.setItem('attemptedImage', file.name);
        }
        return;
      }
      buffer.push(response.text());
      let markdownContent = md.render(buffer.join(''));
      codePreview.textContent = markdownContent; // Display the generated code
    }
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

// Preview the uploaded image
fileInput.addEventListener('change', () => {
  let file = fileInput.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = () => {
      imagePreview.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

// Handle copy button click
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(codePreview.textContent)
    .then(() => {
      alert('Code copied to clipboard!');
    })
    .catch(err => {
      alert('Failed to copy code: ' + err);
    });
});

// You can delete this once you've filled out an API key
maybeShowApiKeyBanner(API_KEY);
