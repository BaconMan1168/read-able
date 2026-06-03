chrome.storage.sync.get({ disabledSites: [] }, (result) => {
  const domain = window.location.hostname;

  if (result.disabledSites.includes(domain)) {
    return;
  }

  const DEFAULT_STATE = {
    isDyslexia: false,
    isContrast: false,
    fontSize: 1,
    letterSpacing: 0,
    lineSpacing: 1.5,
    scope: "all",
    readingAid: "none",
    readingAidHeight: 72,
    readingAidOpacity: 0.24,
    readingAidColor: "#ffe066",
  };

  const state = { ...DEFAULT_STATE };
  const originalFontSizes = new Map();
  let applyFrame = null;
  let pointerY = Math.round(window.innerHeight / 2);

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
      --readable-ruler-y: 50vh;
      --readable-aid-height: 72px;
      --readable-aid-opacity: 0.24;
      --readable-aid-color: #ffe066;
    }

    body.readable-letter-spacing p,
    body.readable-letter-spacing span:not([role="button"]):not(.material-icons):not(.material-symbols-outlined):not(.material-symbols-rounded):not(.material-symbols-sharp):not(.icon),
    body.readable-letter-spacing h1, body.readable-letter-spacing h2, body.readable-letter-spacing h3,
    body.readable-letter-spacing h4, body.readable-letter-spacing h5, body.readable-letter-spacing h6,
    body.readable-letter-spacing li,
    body.readable-letter-spacing td, body.readable-letter-spacing th,
    body.readable-letter-spacing label,
    body.readable-letter-spacing a:not([role="button"]) {
      letter-spacing: var(--a11y-letter-spacing) !important;
    }

    body.readable-line-spacing p,
    body.readable-line-spacing li,
    body.readable-line-spacing td,
    body.readable-line-spacing th {
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
    body svg,
    body [role="img"],
    body [aria-hidden="true"],
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

    .readable-reading-aid {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      display: none;
    }

    .readable-reading-aid[data-mode="ruler"],
    .readable-reading-aid[data-mode="focus"] {
      display: block;
    }

    .readable-reading-aid[data-mode="ruler"]::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: calc(var(--readable-ruler-y) - (var(--readable-aid-height) / 2));
      height: var(--readable-aid-height);
      background: var(--readable-aid-color);
      opacity: var(--readable-aid-opacity);
    }

    .readable-reading-aid[data-mode="focus"] {
      background:
        linear-gradient(
          to bottom,
          rgba(0, 0, 0, var(--readable-aid-opacity)) 0,
          rgba(0, 0, 0, var(--readable-aid-opacity)) calc(var(--readable-ruler-y) - (var(--readable-aid-height) / 2)),
          transparent calc(var(--readable-ruler-y) - (var(--readable-aid-height) / 2)),
          transparent calc(var(--readable-ruler-y) + (var(--readable-aid-height) / 2)),
          rgba(0, 0, 0, var(--readable-aid-opacity)) calc(var(--readable-ruler-y) + (var(--readable-aid-height) / 2)),
          rgba(0, 0, 0, var(--readable-aid-opacity)) 100%
        );
    }
  `;

  document.head.appendChild(styleElement);

  const overlayElement = document.createElement("div");
  overlayElement.className = "readable-reading-aid";
  overlayElement.dataset.mode = "none";
  document.documentElement.appendChild(overlayElement);

  const EXCLUDED_SELECTORS = [
    "canvas",
    "svg",
    "path",
    "img",
    "picture",
    "video",
    "audio",
    "iframe",
    "object",
    "embed",
    "[hidden]",
    "[aria-hidden='true']",
    "[role='img']",
    "[data-no-scale]",
    ".material-icons",
    ".material-symbols-outlined",
    ".material-symbols-rounded",
    ".material-symbols-sharp",
    ".icon",
    ".fa",
    ".fas",
    ".far",
    ".fab",
    ".fal",
    ".fad",
    ".lucide",
  ];

  function shouldExcludeElement(el) {
    if (!el.matches) return true;

    if (el.closest(".readable-reading-aid")) {
      return true;
    }

    const className = typeof el.className === "string" ? el.className : "";
    if (/\b(icon|material-icons|material-symbols|fa|fas|far|fab|fal|fad|lucide)\b/i.test(className)) {
      return true;
    }

    return EXCLUDED_SELECTORS.some((selector) => {
      try {
        return el.matches(selector);
      } catch {
        return false;
      }
    });
  }

  function getMainRoots() {
    const roots = Array.from(document.querySelectorAll("article, main, [role='main']"));
    return roots.length > 0 ? roots : [document.body];
  }

  function getSelectionRoots() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return [];
    }

    const selectedElements = new Set();
    const allElements = document.body.querySelectorAll("*");

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);
      allElements.forEach((el) => {
        try {
          if (range.intersectsNode(el)) {
            selectedElements.add(el);
          }
        } catch {
          // Some detached nodes can throw while the page is changing.
        }
      });
    }

    return Array.from(selectedElements);
  }

  function getScopeRoots() {
    if (state.scope === "main") {
      return getMainRoots();
    }

    if (state.scope === "selection") {
      return getSelectionRoots();
    }

    return [document.body];
  }

  function getScalableElements() {
    const roots = getScopeRoots().filter(Boolean);
    const elements = new Set();

    roots.forEach((root) => {
      if (root !== document.body && !shouldExcludeElement(root)) {
        elements.add(root);
      }

      root.querySelectorAll("*").forEach((el) => {
        if (!shouldExcludeElement(el)) {
          elements.add(el);
        }
      });
    });

    return elements;
  }

  function cacheOriginalFontSize(el) {
    if (originalFontSizes.has(el)) return;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;

    const computedSize = parseFloat(style.fontSize);
    if (Number.isNaN(computedSize) || computedSize <= 0) return;

    const baseSize = state.fontSize === 1 ? computedSize : computedSize / state.fontSize;
    originalFontSizes.set(el, {
      baseSize,
      inlineFontSize: el.style.fontSize,
    });
  }

  function restoreFontSize(el, original) {
    el.style.fontSize = original.inlineFontSize;
  }

  function pruneOriginalFontSizes() {
    originalFontSizes.forEach((_, el) => {
      if (!document.contains(el)) {
        originalFontSizes.delete(el);
      }
    });
  }

  function applyFontScale() {
    const scopedElements = getScalableElements();
    pruneOriginalFontSizes();

    scopedElements.forEach(cacheOriginalFontSize);

    originalFontSizes.forEach((original, el) => {
      if (state.fontSize === 1 || !scopedElements.has(el)) {
        restoreFontSize(el, original);
      } else {
        el.style.fontSize = `${original.baseSize * state.fontSize}px`;
      }
    });
  }

  function applyReadingAid() {
    const mode = state.readingAid === "ruler" || state.readingAid === "focus" ? state.readingAid : "none";

    overlayElement.dataset.mode = mode;
    document.documentElement.style.setProperty("--readable-ruler-y", `${pointerY}px`);
    document.documentElement.style.setProperty("--readable-aid-height", `${state.readingAidHeight}px`);
    document.documentElement.style.setProperty("--readable-aid-opacity", state.readingAidOpacity);
    document.documentElement.style.setProperty("--readable-aid-color", state.readingAidColor);
  }

  function applySettings() {
    document.body.classList.toggle("font-dyslexic", state.isDyslexia);
    document.body.classList.toggle("high-contrast", state.isContrast);
    document.body.classList.toggle("readable-letter-spacing", state.letterSpacing !== 0);
    document.body.classList.toggle("readable-line-spacing", state.lineSpacing !== 1.5);

    document.documentElement.style.setProperty("--a11y-letter-spacing", `${state.letterSpacing}em`);
    document.documentElement.style.setProperty(
      "--a11y-line-height",
      state.lineSpacing === 1.5 ? "normal" : state.lineSpacing
    );

    applyFontScale();
    applyReadingAid();
  }

  function scheduleApplySettings() {
    if (applyFrame !== null) {
      cancelAnimationFrame(applyFrame);
    }

    applyFrame = requestAnimationFrame(() => {
      applyFrame = null;
      applySettings();
    });
  }

  function updateState(nextState) {
    Object.assign(state, nextState);
    scheduleApplySettings();
  }

  function handlePointerMove(event) {
    pointerY = event.clientY;
    if (state.readingAid !== "none") {
      applyReadingAid();
    }
  }

  window.addEventListener("mousemove", handlePointerMove, { passive: true });

  const observer = new MutationObserver((mutations) => {
    if (state.fontSize === 1) return;

    const hasAddedElements = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE)
    );

    if (hasAddedElements) {
      scheduleApplySettings();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  chrome.storage.sync.get(DEFAULT_STATE, (storedState) => {
    updateState(storedState);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "updateSettings") {
      updateState(message.settings);
      sendResponse({ ok: true });
      return;
    }

    if (message.action === "toggleDyslexicFont") {
      updateState({ isDyslexia: message.enabled });
    }
    if (message.action === "toggleHighContrast") {
      updateState({ isContrast: message.enabled });
    }
    if (message.action === "adjustFontSize") {
      updateState({ fontSize: message.fontSize });
    }
    if (message.action === "adjustLetterSpacing") {
      updateState({ letterSpacing: message.letterSpacing });
    }
    if (message.action === "adjustLineSpacing") {
      updateState({ lineSpacing: message.lineSpacing });
    }

    sendResponse({ ok: true });
  });
});
