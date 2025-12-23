chrome.storage.sync.get({ disabledSites: [] }, (result) => {
  const domain = window.location.hostname;

  if (result.disabledSites.includes(domain)) {
    console.log(`ReadAble is disabled on ${domain}`);
    return; 
  }

  const styleElement = document.createElement("style");
  styleElement.dataset.ext = "accessibility";

  styleElement.textContent = `
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Regular.woff2")}') format('woff2');
      font-weight: normal; font-style: normal;
    }
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Bold.woff2")}') format('woff2');
      font-weight: bold; font-style: normal;
    }
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Italic.woff2")}') format('woff2');
      font-weight: normal; font-style: italic;
    }
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Bold-Italic.woff2")}') format('woff2');
      font-weight: bold; font-style: italic;
    }

    :root {
      --a11y-letter-spacing: 0em;
      --a11y-line-height: normal;
    }

    body.readable-active p,
    body.readable-active span:not([role="button"]):not(.material-icons):not(.icon),
    body.readable-active h1, body.readable-active h2, body.readable-active h3,
    body.readable-active h4, body.readable-active h5, body.readable-active h6,
    body.readable-active li,
    body.readable-active td, body.readable-active th,
    body.readable-active label,
    body.readable-active a:not([role="button"]) {
      letter-spacing: var(--a11y-letter-spacing) !important;
    }

    body.readable-active p,
    body.readable-active li,
    body.readable-active td, body.readable-active th {
      line-height: var(--a11y-line-height) !important;
    }

    body.font-dyslexic p, body.font-dyslexic span,
    body.font-dyslexic h1, body.font-dyslexic h2, body.font-dyslexic h3,
    body.font-dyslexic h4, body.font-dyslexic h5, body.font-dyslexic h6,
    body.font-dyslexic li, body.font-dyslexic a, body.font-dyslexic button,
    body.font-dyslexic input, body.font-dyslexic textarea, body.font-dyslexic label {
      font-family: 'OpenDyslexic', sans-serif !important;
    }

    body canvas,
    body [role="img"],
    body .no-scale {
      letter-spacing: 0 !important;
      line-height: normal !important;
    }

    body.high-contrast img, body.high-contrast svg, body.high-contrast canvas {
      filter: none !important; 
      background: none !important;
      fill: white; stroke: white;
    }

    body.high-contrast, body.high-contrast html, body.high-contrast main, 
    body.high-contrast header, body.high-contrast footer, body.high-contrast section, 
    body.high-contrast article, body.high-contrast nav, body.high-contrast aside, 
    body.high-contrast div, body.high-contrast button {
      background-color: black !important;
    }

    body.high-contrast p, body.high-contrast span, body.high-contrast h1, 
    body.high-contrast h2, body.high-contrast h3, body.high-contrast h4, 
    body.high-contrast h5, body.high-contrast h6, body.high-contrast li, 
    body.high-contrast a, body.high-contrast button, body.high-contrast input, 
    body.high-contrast textarea, body.high-contrast label {
      color: white !important;
    }

    body.high-contrast a, body.high-contrast a * {
      color: #fffe00 !important;
      background-color: black !important;
      text-decoration: underline;
    }

    body.high-contrast :disabled, body.high-contrast [disabled], body.high-contrast .disabled {
      color: #3ef240 !important;
    }

    body.high-contrast ::selection {
      background-color: #19ebfe !important;
      color: black !important;
    }

    body.high-contrast button, body.high-contrast input[type="button"], 
    body.high-contrast input[type="submit"] {
      background-color: black !important;
      color: white !important;
      border: 1px solid #19ebfe !important;
    }

    body.high-contrast *:focus {
      outline: 2px solid #19ebfe !important;
      outline-offset: 2px !important;
    }
  `;

  document.head.appendChild(styleElement);

  const originalFontSizes = new Map();
  let currentScale = 1;

  const EXCLUDED_SELECTORS = [
    'canvas',
    '[role="img"]',
    '.material-icons',
    '.icon',
    'svg',
    'path',
    '[data-no-scale]'
  ];

  function shouldExcludeElement(el) {
    return EXCLUDED_SELECTORS.some(selector => {
      try {
        return el.matches && el.matches(selector);
      } catch {
        return false;
      }
    });
  }

  function cacheOriginalFontSizes(root = document.body) {
    if (!root || root.nodeType !== 1) return;

    const elements = root.querySelectorAll("*");
    elements.forEach(el => {
      if (!originalFontSizes.has(el) && !shouldExcludeElement(el)) {
        const style = window.getComputedStyle(el);
        const size = parseFloat(style.fontSize);
        if (!isNaN(size) && size > 0) {
          originalFontSizes.set(el, size);
        }
      }
    });
  }

  function applyScale(scale) {
    currentScale = scale;
    
    const toDelete = [];
    originalFontSizes.forEach((baseSize, el) => {
      if (!document.contains(el)) {
        toDelete.push(el);
      }
    });
    toDelete.forEach(el => originalFontSizes.delete(el));

    originalFontSizes.forEach((baseSize, el) => {
      if (scale === 1) {
        el.style.fontSize = '';
      } else {
        el.style.fontSize = (baseSize * scale) + "px";
      }
    });
  }

  cacheOriginalFontSizes();

  const observer = new MutationObserver(mutations => {
    let needsUpdate = false;
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          cacheOriginalFontSizes(node);
          needsUpdate = true;
        }
      });
    });
    
    if (needsUpdate && currentScale !== 1) {
      applyScale(currentScale);
    }
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

  chrome.storage.sync.get(
    {
      isDyslexia: false,
      isContrast: false,
      fontSize: 1,
      letterSpacing: 0,
      lineSpacing: 1.5
    },
    (result) => {
      const hasActiveSettings = result.letterSpacing !== 0 || result.lineSpacing !== 1.5;
      if (hasActiveSettings) {
        document.body.classList.add("readable-active");
      }

      if (result.isDyslexia) {
        document.body.classList.add("font-dyslexic");
      }
      if (result.isContrast) {
        document.body.classList.add("high-contrast");
      }

      applyScale(result.fontSize);
      
      const lineHeight = result.lineSpacing === 1.5 ? 'normal' : result.lineSpacing;
      document.documentElement.style.setProperty("--a11y-letter-spacing", `${result.letterSpacing}em`);
      document.documentElement.style.setProperty("--a11y-line-height", lineHeight);
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
      applyScale(message.fontSize);
    }
    if (message.action === "adjustLetterSpacing") {
      const hasActiveSettings = message.letterSpacing !== 0;
      document.body.classList.toggle("readable-active", hasActiveSettings);
      document.documentElement.style.setProperty("--a11y-letter-spacing", `${message.letterSpacing}em`);
    }
    if (message.action === "adjustLineSpacing") {
      const hasActiveSettings = message.lineSpacing !== 1.5;
      document.body.classList.toggle("readable-active", hasActiveSettings);
      const lineHeight = message.lineSpacing === 1.5 ? 'normal' : message.lineSpacing;
      document.documentElement.style.setProperty("--a11y-line-height", lineHeight);
    }
  });
});