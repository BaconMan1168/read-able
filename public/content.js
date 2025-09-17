const styleElement = document.createElement("style");
styleElement.dataset.ext = "dyslexic"; // mark it for reference

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
    src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Bold-Italic.woff2")}') format('woff2');
    font-weight: bold;
    font-style: italic;
  }

  /* Safe universal override */
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
`;

// Append it once to the head
document.head.appendChild(styleElement);

// Initially off
let dyslexicEnabled = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleDyslexicFont") {
    dyslexicEnabled = message.enabled;
    if (dyslexicEnabled) {
      document.body.classList.add("font-dyslexic");
    } else {
      document.body.classList.remove("font-dyslexic");
    }
  }
});