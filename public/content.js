const DEFAULT_STATE = {
  isDyslexia: false,
  isContrast: false,
  fontSize: 1,
  letterSpacing: 0,
  lineSpacing: 1.5,
  readingAid: "none",
  readingAidHeight: 72,
  readingAidOpacity: 0.24,
  readingAidColor: "#ffe066",
};

const PAUSED_SITE_RULES = [
  { host: "docs.google.com" },
  { host: "drive.google.com" },
  { host: "mail.google.com" },
  { host: "calendar.google.com" },
  { host: "keep.google.com" },
  { host: "meet.google.com" },
  { host: "chat.google.com" },
  { host: "classroom.google.com" },
  { host: "notion.so" },
  { host: "figma.com" },
  { host: "canva.com" },
  { host: "overleaf.com" },
  { host: "codepen.io" },
  { host: "codesandbox.io" },
  { host: "stackblitz.com" },
  { host: "replit.com" },
  { host: "glitch.com" },
  { host: "jsfiddle.net" },
  { host: "github.dev" },
  { host: "vscode.dev" },
  { host: "office.com" },
  { host: "microsoft365.com" },
  { host: "officeapps.live.com" },
  { host: "sharepoint.com" },
  { host: "onedrive.live.com" },
];

function getHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(hostname, ruleHost) {
  return hostname === ruleHost || hostname.endsWith(`.${ruleHost}`);
}

function locationMatchesRule(locationValue, rule) {
  const hostname = getHostname(locationValue);
  return Boolean(hostname) && hostMatches(hostname, rule.host);
}

function getFrameLocations() {
  const locations = [window.location.href];

  if (window.location.ancestorOrigins) {
    locations.push(...Array.from(window.location.ancestorOrigins));
  }

  return locations;
}

function isPausedSite() {
  return getFrameLocations().some((locationValue) =>
    PAUSED_SITE_RULES.some((rule) => locationMatchesRule(locationValue, rule))
  );
}

function isUserDisabledSite(disabledSites) {
  const disabledHosts = disabledSites.map((site) => site.toLowerCase());

  return getFrameLocations().some((locationValue) => {
    const hostname = getHostname(locationValue);
    return disabledHosts.some((disabledHost) => hostMatches(hostname, disabledHost));
  });
}

function hasActiveSettings(settings) {
  return (
    settings.isDyslexia ||
    settings.isContrast ||
    settings.fontSize !== 1 ||
    settings.letterSpacing !== 0 ||
    settings.lineSpacing !== 1.5 ||
    settings.readingAid !== "none"
  );
}

if (!globalThis.__readableContentScriptLoaded && !isPausedSite()) {
  globalThis.__readableContentScriptLoaded = true;

  const state = { ...DEFAULT_STATE };
  const originalFontSizes = new Map();
  const isTopFrame = window.top === window;
  let applyFrame = null;
  let pointerFrame = null;
  let pointerY = Math.round(window.innerHeight / 2);
  let isInitialized = false;
  let isPointerListenerAttached = false;
  let isObserverAttached = false;
  let styleElement = null;
  let overlayElement = null;
  let rulerElement = null;
  let focusTopElement = null;
  let focusBottomElement = null;
  let observer = null;

  function ensureInitialized() {
    if (isInitialized) return;

    styleElement = document.createElement("style");
    styleElement.dataset.ext = "accessibility";

    styleElement.textContent = `
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Regular.woff2")}') format('woff2');
        font-weight: normal; font-style: normal;
        size-adjust: 93%;
      }
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Bold.woff2")}') format('woff2');
        font-weight: bold; font-style: normal;
        size-adjust: 93%;
      }
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Italic.woff2")}') format('woff2');
        font-weight: normal; font-style: italic;
        size-adjust: 93%;
      }
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('${chrome.runtime.getURL("fonts/OpenDyslexic/compiled/OpenDyslexic-Bold-Italic.woff2")}') format('woff2');
        font-weight: bold; font-style: italic;
        size-adjust: 93%;
      }

      :root {
        --a11y-letter-spacing: 0em;
        --a11y-line-height: normal;
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
        overflow-wrap: break-word;
        word-break: normal;
      }

      body.font-dyslexic :is([contenteditable], [role="textbox"], input, textarea, select, pre, code, kbd, samp, .CodeMirror, .monaco-editor, .cm-editor, .ProseMirror, .ql-editor),
      body.font-dyslexic :is([contenteditable], [role="textbox"], input, textarea, select, pre, code, kbd, samp, .CodeMirror, .monaco-editor, .cm-editor, .ProseMirror, .ql-editor) *,
      body.readable-letter-spacing :is([contenteditable], [role="textbox"], input, textarea, select, pre, code, kbd, samp, .CodeMirror, .monaco-editor, .cm-editor, .ProseMirror, .ql-editor),
      body.readable-letter-spacing :is([contenteditable], [role="textbox"], input, textarea, select, pre, code, kbd, samp, .CodeMirror, .monaco-editor, .cm-editor, .ProseMirror, .ql-editor) *,
      body.readable-line-spacing :is([contenteditable], [role="textbox"], input, textarea, select, pre, code, kbd, samp, .CodeMirror, .monaco-editor, .cm-editor, .ProseMirror, .ql-editor),
      body.readable-line-spacing :is([contenteditable], [role="textbox"], input, textarea, select, pre, code, kbd, samp, .CodeMirror, .monaco-editor, .cm-editor, .ProseMirror, .ql-editor) * {
        font-family: revert !important;
        letter-spacing: revert !important;
        line-height: revert !important;
      }

      body canvas,
      body svg,
      body [role="img"],
      body [aria-hidden="true"],
      body .no-scale {
        letter-spacing: 0 !important;
        line-height: normal !important;
      }

      body.high-contrast {
        background-color: black !important;
        color: white !important;
        color-scheme: dark;
      }

      body.high-contrast :is(main, header, footer, section, article, nav, aside, form, dialog, [role="dialog"], [role="main"]) {
        background-color: black !important;
        color: white !important;
      }

      body.high-contrast :is(p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, caption, label, legend, summary, dt, dd) {
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

      body.high-contrast :is(input, textarea, select) {
        background-color: black !important;
        color: white !important;
        border-color: #19ebfe !important;
      }

      body.high-contrast button, body.high-contrast [role="button"],
      body.high-contrast input[type="button"], body.high-contrast input[type="submit"] {
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

      .readable-ruler-strip,
      .readable-focus-shade {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        display: none;
        transform: translate3d(0, -100vh, 0);
        will-change: transform;
      }

      .readable-ruler-strip {
        height: var(--readable-aid-height);
        background: var(--readable-aid-color);
        opacity: var(--readable-aid-opacity);
      }

      .readable-focus-shade {
        height: 1px;
        background: rgba(0, 0, 0, var(--readable-aid-opacity));
        transform-origin: top left;
      }

      .readable-reading-aid[data-mode="ruler"] .readable-ruler-strip {
        display: block;
      }

      .readable-reading-aid[data-mode="focus"] .readable-focus-shade {
        display: block;
      }
    `;

    document.head.appendChild(styleElement);

    overlayElement = isTopFrame ? document.createElement("div") : null;
    if (overlayElement) {
      overlayElement.className = "readable-reading-aid";
      overlayElement.dataset.mode = "none";
      rulerElement = document.createElement("div");
      focusTopElement = document.createElement("div");
      focusBottomElement = document.createElement("div");

      rulerElement.className = "readable-ruler-strip";
      focusTopElement.className = "readable-focus-shade";
      focusBottomElement.className = "readable-focus-shade";

      overlayElement.append(rulerElement, focusTopElement, focusBottomElement);
      document.documentElement.appendChild(overlayElement);
    }

    observer = new MutationObserver((mutations) => {
      let hasRemovedElements = false;
      const addedElements = [];

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            addedElements.push(node);
          }
        });

        if (!hasRemovedElements) {
          hasRemovedElements = Array.from(mutation.removedNodes).some(
            (node) => node.nodeType === Node.ELEMENT_NODE
          );
        }
      });

      if (hasRemovedElements) {
        pruneOriginalFontSizes();
      }

      if (addedElements.length > 0) {
        applyFontScaleToAddedElements(addedElements);
      }
    });

    isInitialized = true;
  }

  const EXCLUDED_SELECTORS = [
    "canvas",
    "svg",
    "path",
    "img",
    "picture",
    "video",
    "audio",
    "iframe",
    "input",
    "textarea",
    "select",
    "button",
    "pre",
    "code",
    "kbd",
    "samp",
    "object",
    "embed",
    "[hidden]",
    "[aria-hidden='true']",
    "[role='img']",
    "[role='button']",
    "[role='textbox']",
    "[contenteditable]",
    "[data-no-scale]",
    ".CodeMirror",
    ".monaco-editor",
    ".cm-editor",
    ".ProseMirror",
    ".ql-editor",
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
  const EXCLUDED_SELECTOR = EXCLUDED_SELECTORS.join(",");
  const TEXT_SCALE_SELECTORS = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "td",
    "th",
    "blockquote",
    "figcaption",
    "caption",
    "label",
    "legend",
    "summary",
    "dt",
    "dd",
    "a",
    "span",
  ].join(",");
  const BLOCK_CHILD_SELECTORS = [
    "address",
    "article",
    "aside",
    "blockquote",
    "details",
    "dialog",
    "div",
    "dl",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "ul",
  ].join(",");

  function hasVisibleDirectText(el) {
    return Array.from(el.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ""
    );
  }

  function hasBlockChildren(el) {
    return Array.from(el.children).some((child) => child.matches?.(BLOCK_CHILD_SELECTORS));
  }

  function isScalableTextElement(el) {
    if (el.matches(TEXT_SCALE_SELECTORS)) {
      return true;
    }

    return hasVisibleDirectText(el) && !hasBlockChildren(el);
  }

  function addScalableElement(el, elements) {
    if (!shouldExcludeElement(el) && isScalableTextElement(el)) {
      elements.add(el);
    }

    if (el.shadowRoot) {
      collectScalableElements(el.shadowRoot, elements);
    }
  }

  function shouldExcludeElement(el) {
    if (!el.matches) return true;

    if (el.closest(".readable-reading-aid")) {
      return true;
    }

    const className = typeof el.className === "string" ? el.className : "";
    if (/\b(icon|material-icons|material-symbols|fa|fas|far|fab|fal|fad|lucide)\b/i.test(className)) {
      return true;
    }

    try {
      return Boolean(el.closest(EXCLUDED_SELECTOR));
    } catch {
      return true;
    }
  }

  function collectScalableElements(root, elements) {
    if (root.nodeType === Node.ELEMENT_NODE) {
      addScalableElement(root, elements);
    }

    root.querySelectorAll("*").forEach((el) => {
      addScalableElement(el, elements);
    });
  }

  function getScalableElements(root = document.body) {
    const elements = new Set();
    collectScalableElements(root, elements);

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

  function scaleFontSize(el, original) {
    el.style.fontSize = `${original.baseSize * state.fontSize}px`;
  }

  function pruneOriginalFontSizes() {
    originalFontSizes.forEach((_, el) => {
      if (!el.isConnected) {
        originalFontSizes.delete(el);
      }
    });
  }

  function applyFontScaleToElements(elements) {
    elements.forEach(cacheOriginalFontSize);
    elements.forEach((el) => {
      const original = originalFontSizes.get(el);
      if (original) {
        scaleFontSize(el, original);
      }
    });
  }

  function applyFontScale() {
    const scopedElements = getScalableElements();
    pruneOriginalFontSizes();

    originalFontSizes.forEach((original, el) => {
      if (state.fontSize === 1 || !scopedElements.has(el)) {
        restoreFontSize(el, original);
      } else {
        scaleFontSize(el, original);
      }
    });

    if (state.fontSize !== 1) {
      applyFontScaleToElements(scopedElements);
    }
  }

  function applyFontScaleToAddedElements(addedElements) {
    if (state.fontSize === 1) return;

    const scopedElements = new Set();
    addedElements.forEach((el) => collectScalableElements(el, scopedElements));
    applyFontScaleToElements(scopedElements);
  }

  function applyReadingAid() {
    if (!overlayElement) return;

    const mode = state.readingAid === "ruler" || state.readingAid === "focus" ? state.readingAid : "none";

    overlayElement.dataset.mode = mode;
    updateReadingAidPosition();
    document.documentElement.style.setProperty("--readable-aid-height", `${state.readingAidHeight}px`);
    document.documentElement.style.setProperty("--readable-aid-opacity", state.readingAidOpacity);
    document.documentElement.style.setProperty("--readable-aid-color", state.readingAidColor);
  }

  function updateReadingAidPosition() {
    if (!rulerElement || !focusTopElement || !focusBottomElement) return;

    const aidHeight = state.readingAidHeight;
    const y = Math.min(Math.max(pointerY, 0), window.innerHeight);
    const topEdge = Math.max(0, y - aidHeight / 2);
    const bottomEdge = Math.min(window.innerHeight, y + aidHeight / 2);
    const bottomShadeHeight = Math.max(0, window.innerHeight - bottomEdge);

    rulerElement.style.transform = `translate3d(0, ${y - aidHeight / 2}px, 0)`;
    focusTopElement.style.transform = `translate3d(0, 0, 0) scaleY(${topEdge})`;
    focusBottomElement.style.transform = `translate3d(0, ${bottomEdge}px, 0) scaleY(${bottomShadeHeight})`;
  }

  function scheduleReadingAidPosition() {
    if (pointerFrame !== null) return;

    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = null;
      updateReadingAidPosition();
    });
  }

  function syncPointerListener() {
    if (!isTopFrame) return;

    const shouldAttach = state.readingAid === "ruler" || state.readingAid === "focus";

    if (shouldAttach && !isPointerListenerAttached) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("resize", handleViewportResize);
      isPointerListenerAttached = true;
    }

    if (!shouldAttach && isPointerListenerAttached) {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleViewportResize);
      isPointerListenerAttached = false;
      if (pointerFrame !== null) {
        cancelAnimationFrame(pointerFrame);
        pointerFrame = null;
      }
    }
  }

  function syncObserver() {
    if (!observer) return;

    if (state.fontSize !== 1 && !isObserverAttached) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      isObserverAttached = true;
    }

    if (state.fontSize === 1 && isObserverAttached) {
      observer.disconnect();
      isObserverAttached = false;
      pruneOriginalFontSizes();
    }
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
    syncPointerListener();
    syncObserver();
  }

  function scheduleApplySettings() {
    if (!hasActiveSettings(state) && !isInitialized) return;

    ensureInitialized();

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
      scheduleReadingAidPosition();
    }
  }

  function handleViewportResize() {
    pointerY = Math.min(pointerY, window.innerHeight);
    if (state.readingAid !== "none") {
      scheduleReadingAidPosition();
    }
  }

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

  chrome.storage.sync.get({ ...DEFAULT_STATE, disabledSites: [] }, (storedState) => {
    const { disabledSites, ...settings } = storedState;

    if (isUserDisabledSite(disabledSites)) {
      return;
    }

    updateState(settings);
  });
}
