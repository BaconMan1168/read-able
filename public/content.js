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

  :root {
    --a11y-font-scale: 1;
    --a11y-letter-spacing: 0em;
    --a11y-line-height: 1.5;
  }

  /* Dyslexic font */
  body.font-dyslexic,
  body.font-dyslexic * {
    font-family: 'OpenDyslexic', sans-serif !important;
  }

  /* High contrast */
  body.high-contrast img,
  body.high-contrast svg,
  body.high-contrast canvas {
    filter: none !important; 
    background: none !important;
  }

  body.high-contrast,
  body.high-contrast html,
  body.high-contrast main,
  body.high-contrast header,
  body.high-contrast footer,
  body.high-contrast section,
  body.high-contrast article,
  body.high-contrast nav,
  body.high-contrast aside,
  body.high-contrast div {
    background-color: black !important;
  }

  body.high-contrast p,
  body.high-contrast span,
  body.high-contrast h1,
  body.high-contrast h2,
  body.high-contrast h3,
  body.high-contrast h4,
  body.high-contrast h5,
  body.high-contrast h6,
  body.high-contrast li,
  body.high-contrast a,
  body.high-contrast button,
  body.high-contrast input,
  body.high-contrast textarea,
  body.high-contrast label {
    color: white !important;
  }

  body.high-contrast a,
  body.high-contrast a * {
    color: #fffe00 !important;
  }

  body.high-contrast :disabled,
  body.high-contrast [disabled],
  body.high-contrast .disabled {
    color: #3ef240 !important;
  }

  body.high-contrast ::selection {
    background-color: #19ebfe !important;
    color: black !important;
  }

  body.high-contrast button,
  body.high-contrast input[type="button"],
  body.high-contrast input[type="submit"] {
    background-color: black !important;
    color: white !important;
    border: 1px solid #19ebfe !important;
  }

  body.high-contrast *:focus {
    outline: 2px solid #19ebfe !important;
    outline-offset: 2px !important;
  }

  /* Accessibility scaling */
  body.accessibility-adjustable {
    font-size: calc(1rem * var(--a11y-font-scale)) !important;
    letter-spacing: var(--a11y-letter-spacing);
    line-height: var(--a11y-line-height);
  }

  /* Apply scaling to all descendants */
  body.accessibility-adjustable * {
    font-size: inherit !important; /* inherit from parent to scale proportionally */
    letter-spacing: inherit !important;
    line-height: inherit !important;
  }
`;

document.head.appendChild(styleElement);

//Load saved settings onto webpage immediately
chrome.storage.sync.get(
  {
    isDyslexia: false,
    isContrast: false,
    fontSize: 1,
    letterSpacing: 0,
    lineSpacing: 1.5
  },
  (result) => {
    if (result.isDyslexia){
      document.body.classList.toggle("font-dyslexic", result.isDyslexia);
    }
    if (result.isContrast){
      document.body.classList.toggle("high-contrast", result.isContrast);
    }

    document.body.classList.add("accessibility-adjustable");
    document.body.style.setProperty("--a11y-font-scale", result.fontSize);
    document.body.style.setProperty("--a11y-letter-spacing", `${result.letterSpacing}em`);
    document.body.style.setProperty("--a11y-line-height", `${result.lineSpacing}`);
  }
);

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggleDyslexicFont") {
    document.body.classList.toggle("font-dyslexic", message.enabled);
  }

  if (message.action === "toggleHighContrast") {
    document.body.classList.toggle("high-contrast", message.enabled);
  }

  if (message.action === "adjustFontSize") {
    document.body.classList.add("accessibility-adjustable");
    document.body.style.setProperty("--a11y-font-scale", message.fontSize);
  }

  if (message.action === "adjustLetterSpacing") {
    document.body.classList.add("accessibility-adjustable");
    document.body.style.setProperty("--a11y-letter-spacing", `${message.letterSpacing}em`);
  }

  if (message.action === "adjustLineSpacing") {
    document.body.classList.add("accessibility-adjustable");
    document.body.style.setProperty("--a11y-line-height", `${message.lineSpacing}`);
  }
});