const styleElement = document.createElement("style");
styleElement.dataset.ext = "accessibility";
styleElement.textContent = `

  /* ------------------ OpenDyslexic Font ------------------ */
  @font-face {
    font-family: 'OpenDyslexic';
    src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Regular.woff2")}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'OpenDyslexic';
    src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Bold.woff2")}') format('woff2');
    font-weight: bold;
    font-style: normal;
  }
  @font-face {
    font-family: 'OpenDyslexic';
    src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Italic.woff2")}') format('woff2');
    font-weight: normal;
    font-style: italic;
  }
  @font-face {
    font-family: 'OpenDyslexic';
    src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-BoldItalic.woff2")}') format('woff2');
    font-weight: bold;
    font-style: italic;
  }

  body.font-dyslexic,
  body.font-dyslexic *,
  body.font-dyslexic h1,
  body.font-dyslexic h2,
  body.font-dyslexic h3,
  body.font-dyslexic h4,
  body.font-dyslexic h5,
  body.font-dyslexic h6,
  body.font-dyslexic p,
  body.font-dyslexic span,
  body.font-dyslexic div,
  body.font-dyslexic a,
  body.font-dyslexic li,
  body.font-dyslexic button,
  body.font-dyslexic input,
  body.font-dyslexic textarea {
    font-family: 'OpenDyslexic', sans-serif !important;
  }

  /* ------------------ High Contrast Mode ------------------ */
  body.high-contrast,
  body.high-contrast * {
    background-color: black !important;
    color: white !important;
  }

  body.high-contrast a,
  body.high-contrast a * {
    color: yellow !important;
  }

  body.high-contrast :disabled,
  body.high-contrast [disabled],
  body.high-contrast .disabled {
    color: green !important;
  }

  body.high-contrast ::selection {
    background-color: lightblue !important;
    color: black !important;
  }

  body.high-contrast button,
  body.high-contrast input[type="button"],
  body.high-contrast input[type="submit"] {
    background-color: black !important;
    color: white !important;
    border: 1px solid lightblue !important;
  }

  body.high-contrast *:focus {
    outline: 2px solid lightblue !important;
    outline-offset: 2px !important;
  }
`;


document.head.appendChild(styleElement);


let dyslexicEnabled = false;
let contrastEnabled = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleDyslexicFont") {
    dyslexicEnabled = message.enabled;
    if (dyslexicEnabled) {
      document.body.classList.add("font-dyslexic");
    } 
    else {
      document.body.classList.remove("font-dyslexic");
    }
  }

  if (message.action === "toggleHighContrast") {
    contrastEnabled = message.enabled;
    if (contrastEnabled) {
      document.body.classList.add("high-contrast");
    } 
    else {
      document.body.classList.remove("high-contrast");
    }
  }
});