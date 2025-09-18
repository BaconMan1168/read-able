const styleElement = document.createElement("style");
styleElement.dataset.ext = "accessibility";

styleElement.textContent = `
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

  body.accessibility-adjustable {
    --a11y-font-size: 16px;
    --a11y-letter-spacing: 0em;
    --a11y-line-height: 1.5;
  }

  body.accessibility-adjustable,
  body.accessibility-adjustable * {
    font-size: var(--a11y-font-size) !important;
    letter-spacing: var(--a11y-letter-spacing) !important;
    line-height: var(--a11y-line-height) !important;
  }
`;
document.head.appendChild(styleElement);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleDyslexicFont") {
        document.body.classList.toggle("font-dyslexic", message.enabled);
    }

    if (message.action === "toggleHighContrast") {
        document.body.classList.toggle("high-contrast", message.enabled);
    }

    
    if (message.action === "adjustFontSize"){
        document.body.classList.add("accessibility-adjustable");
        document.body.style.setProperty("--a11y-font-size", `${message.fontSize}px`);
    }

    if (message.action === "adjustLetterSpacing"){
        document.body.classList.add("accessibility-adjustable");
        document.body.style.setProperty("--a11y-letter-spacing", `${message.letterSpacing}em`);
    }

    if (message.action === "adjustLineSpacing"){
        document.body.classList.add("accessibility-adjustable");
        document.body.style.setProperty("--a11y-line-height", `${message.lineSpacing}`);
    }

  
});
