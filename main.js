import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from '../gemini-api-banner';
import './style.css';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// API 키 설정
let API_KEY = 'AIzaSyBt4-KPEwmHT0sMzEN8d3wQ7sJIcH5QjBI';

// DOM 요소 가져오기
let form = document.querySelector('form');
let fileInput = document.querySelector('input[name="chosen-image"]');
let languageSelect = document.querySelector('select[name="language"]');
let output = document.querySelector('.output');
let imagePreview = document.querySelector('.image-preview');
let codePreview = document.querySelector('#code-preview code');
let copyBtn = document.querySelector('#copy-btn');

// 오류 알림 표시 함수
function showErrorNotification(message) {
  let notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.innerHTML = `
    <p>${message}</p>
    <button onclick="this.parentElement.style.display='none'">Close</button>
  `;
  document.body.appendChild(notification);
}

// 반복 시도 처리 함수
function handleRepeatedAttempts() {
  window.location.href = 'repeated-attempts.html';
}

// 폼 제출 이벤트 처리기
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
      codePreview.textContent = markdownContent; // 생성된 코드 표시
    }
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

// 업로드된 이미지 미리보기
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

// 복사 버튼 클릭 처리기
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(codePreview.textContent)
    .then(() => {
      alert('Code copied to clipboard!');
    })
    .catch(err => {
      alert('Failed to copy code: ' + err);
    });
});

// API 키 배너 표시 함수 호출 (API 키 설정 후 삭제 가능)
maybeShowApiKeyBanner(API_KEY);

// 필요한 Firebase SDK 가져오기
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Firebase 구성
const firebaseConfig = {
  apiKey: "AIzaSyCdKIhZSQWJuZOpKWKirw4iwyj6isln9DU",
  authDomain: "gemath-deb68.firebaseapp.com",
  projectId: "gemath-deb68",
  storageBucket: "gemath-deb68.appspot.com",
  messagingSenderId: "281424241013",
  appId: "1:281424241013:web:7b8da39f9135a684b1333c",
  measurementId: "G-2R85V6EHT1"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
