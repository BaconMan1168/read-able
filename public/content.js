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
  const scopedClassRoots = new Set();
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

    .readable-scope-root.readable-letter-spacing:is(p, span:not([role="button"]):not(.material-icons):not(.material-symbols-outlined):not(.material-symbols-rounded):not(.material-symbols-sharp):not(.icon), h1, h2, h3, h4, h5, h6, li, td, th, label, a:not([role="button"])),
    .readable-scope-root.readable-letter-spacing p,
    .readable-scope-root.readable-letter-spacing span:not([role="button"]):not(.material-icons):not(.material-symbols-outlined):not(.material-symbols-rounded):not(.material-symbols-sharp):not(.icon),
    .readable-scope-root.readable-letter-spacing h1, .readable-scope-root.readable-letter-spacing h2, .readable-scope-root.readable-letter-spacing h3,
    .readable-scope-root.readable-letter-spacing h4, .readable-scope-root.readable-letter-spacing h5, .readable-scope-root.readable-letter-spacing h6,
    .readable-scope-root.readable-letter-spacing li,
    .readable-scope-root.readable-letter-spacing td, .readable-scope-root.readable-letter-spacing th,
    .readable-scope-root.readable-letter-spacing label,
    .readable-scope-root.readable-letter-spacing a:not([role="button"]) {
      letter-spacing: var(--a11y-letter-spacing) !important;
    }

    .readable-scope-root.readable-line-spacing:is(p, li, td, th),
    .readable-scope-root.readable-line-spacing p,
    .readable-scope-root.readable-line-spacing li,
    .readable-scope-root.readable-line-spacing td,
    .readable-scope-root.readable-line-spacing th {
      line-height: var(--a11y-line-height) !important;
    }

    .readable-scope-root.font-dyslexic:is(p, span, h1, h2, h3, h4, h5, h6, li, a, button, input, textarea, label),
    .readable-scope-root.font-dyslexic p, .readable-scope-root.font-dyslexic span,
    .readable-scope-root.font-dyslexic h1, .readable-scope-root.font-dyslexic h2, .readable-scope-root.font-dyslexic h3,
    .readable-scope-root.font-dyslexic h4, .readable-scope-root.font-dyslexic h5, .readable-scope-root.font-dyslexic h6,
    .readable-scope-root.font-dyslexic li, .readable-scope-root.font-dyslexic a, .readable-scope-root.font-dyslexic button,
    .readable-scope-root.font-dyslexic input, .readable-scope-root.font-dyslexic textarea, .readable-scope-root.font-dyslexic label {
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

    .readable-scope-root.high-contrast:is(img, svg, canvas),
    .readable-scope-root.high-contrast img, .readable-scope-root.high-contrast svg, .readable-scope-root.high-contrast canvas {
      filter: none !important; 
      background: none !important;
      fill: white; stroke: white;
    }

    .readable-scope-root.high-contrast,
    .readable-scope-root.high-contrast:is(main, header, footer, section, article, nav, aside, div, button),
    .readable-scope-root.high-contrast main, 
    .readable-scope-root.high-contrast header, .readable-scope-root.high-contrast footer, .readable-scope-root.high-contrast section, 
    .readable-scope-root.high-contrast article, .readable-scope-root.high-contrast nav, .readable-scope-root.high-contrast aside, 
    .readable-scope-root.high-contrast div, .readable-scope-root.high-contrast button {
      background-color: black !important;
    }

    .readable-scope-root.high-contrast:is(p, span, h1, h2, h3, h4, h5, h6, li, a, button, input, textarea, label),
    .readable-scope-root.high-contrast p, .readable-scope-root.high-contrast span, .readable-scope-root.high-contrast h1, 
    .readable-scope-root.high-contrast h2, .readable-scope-root.high-contrast h3, .readable-scope-root.high-contrast h4, 
    .readable-scope-root.high-contrast h5, .readable-scope-root.high-contrast h6, .readable-scope-root.high-contrast li, 
    .readable-scope-root.high-contrast a, .readable-scope-root.high-contrast button, .readable-scope-root.high-contrast input, 
    .readable-scope-root.high-contrast textarea, .readable-scope-root.high-contrast label {
      color: white !important;
    }

    .readable-scope-root.high-contrast:is(a),
    .readable-scope-root.high-contrast a,
    .readable-scope-root.high-contrast a * {
      color: #fffe00 !important;
      background-color: black !important;
      text-decoration: underline;
    }

    .readable-scope-root.high-contrast :disabled, .readable-scope-root.high-contrast [disabled], .readable-scope-root.high-contrast .disabled {
      color: #3ef240 !important;
    }

    .readable-scope-root.high-contrast ::selection {
      background-color: #19ebfe !important;
      color: black !important;
    }

    .readable-scope-root.high-contrast:is(button, input[type="button"], input[type="submit"]),
    .readable-scope-root.high-contrast button, .readable-scope-root.high-contrast input[type="button"], 
    .readable-scope-root.high-contrast input[type="submit"] {
      background-color: black !important;
      color: white !important;
      border: 1px solid #19ebfe !important;
    }

    .readable-scope-root.high-contrast *:focus {
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

  function updateScopedClasses() {
    scopedClassRoots.forEach((root) => {
      root.classList.remove(
        "readable-scope-root",
        "font-dyslexic",
        "high-contrast",
        "readable-letter-spacing",
        "readable-line-spacing"
      );
    });
    scopedClassRoots.clear();

    const scopeRoots = getScopeRoots().filter(
      (root) => root && document.contains(root) && (root === document.body || !shouldExcludeElement(root))
    );

    scopeRoots.forEach((root) => {
      root.classList.add("readable-scope-root");
      root.classList.toggle("font-dyslexic", state.isDyslexia);
      root.classList.toggle("high-contrast", state.isContrast);
      root.classList.toggle("readable-letter-spacing", state.letterSpacing !== 0);
      root.classList.toggle("readable-line-spacing", state.lineSpacing !== 1.5);
      scopedClassRoots.add(root);
    });
  }

  function applySettings() {
    document.documentElement.style.setProperty("--a11y-letter-spacing", `${state.letterSpacing}em`);
    document.documentElement.style.setProperty(
      "--a11y-line-height",
      state.lineSpacing === 1.5 ? "normal" : state.lineSpacing
    );

    updateScopedClasses();
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

  function handleSelectionChange() {
    if (state.scope === "selection") {
      scheduleApplySettings();
    }
  }

  window.addEventListener("mousemove", handlePointerMove, { passive: true });
  document.addEventListener("selectionchange", handleSelectionChange);

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
