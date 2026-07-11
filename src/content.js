import {
  disable as disableDarkReader,
  enable as enableDarkReader,
} from "darkreader";

const DEFAULT_STATE = {
  isDyslexia: false,
  isContrast: false,
  contrastMode: "semantic",
  customContrastBackground: "#000000",
  customContrastText: "#ffffff",
  customContrastLink: "#fffe00",
  customContrastAccent: "#19ebfe",
  customContrastDisabled: "#3ef240",
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

const HIGH_CONTRAST_THEME = {
  mode: 1,
  brightness: 100,
  contrast: 115,
  grayscale: 0,
  sepia: 0,
  useFont: false,
  fontFamily: "",
  textStroke: 0,
  darkSchemeBackgroundColor: "#000000",
  darkSchemeTextColor: "#ffffff",
  lightSchemeBackgroundColor: "#ffffff",
  lightSchemeTextColor: "#000000",
  scrollbarColor: "auto",
  selectionColor: "#19ebfe",
  styleSystemControls: true,
};

const HIGH_CONTRAST_FIXES = {
  invert: [],
  css: `
.readable-reading-aid,
.readable-reading-aid * {
  color-scheme: normal !important;
}

.readable-ruler-strip {
  background: var(--readable-aid-color) !important;
}

.readable-focus-shade {
  background: rgba(0, 0, 0, var(--readable-aid-opacity)) !important;
}
`,
  ignoreInlineStyle: [".readable-reading-aid", ".readable-reading-aid *"],
  ignoreImageAnalysis: [".readable-reading-aid", ".readable-reading-aid *"],
  disableStyleSheetsProxy: false,
  ignoreCSSUrl: [],
};

const SEMANTIC_CONTRAST_COLORS = {
  background: "#000000",
  text: "#ffffff",
  link: "#fffe00",
  accent: "#19ebfe",
  disabled: "#3ef240",
};

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
  const pendingChangedKeys = new Set();
  const originalFontSizes = new Map();
  const isTopFrame = window.top === window;
  const TEXT_ADJUSTMENT_KEYS = ["fontSize", "letterSpacing", "lineSpacing"];
  const TEXT_ADJUSTMENT_TRANSITION_MS = 140;
  let applyFrame = null;
  let observerFrame = null;
  let pointerFrame = null;
  let textAdjustmentTimer = null;
  let pointerY = Math.round(window.innerHeight / 2);
  let shouldSmoothTextAdjustment = false;
  let hasPendingRemovedElements = false;
  let isFontScaleCachePrimed = false;
  let isInitialized = false;
  let isPointerListenerAttached = false;
  let isObserverAttached = false;
  let styleElement = null;
  let overlayElement = null;
  let rulerElement = null;
  let focusTopElement = null;
  let focusBottomElement = null;
  let observer = null;
  let isHighContrastApplied = false;
  const pendingAddedElements = new Set();

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
        --readable-contrast-background: #000000;
        --readable-contrast-text: #ffffff;
        --readable-contrast-link: #fffe00;
        --readable-contrast-accent: #19ebfe;
        --readable-contrast-disabled: #3ef240;
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

      body.readable-text-adjusting :is(p, span, h1, h2, h3, h4, h5, h6, li, a, label, td, th, blockquote, figcaption, caption, legend, summary, dt, dd) {
        transition:
          font-size 100ms ease-out,
          line-height 100ms ease-out,
          letter-spacing 100ms ease-out;
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

      body.readable-contrast-static {
        background-color: var(--readable-contrast-background) !important;
        color: var(--readable-contrast-text) !important;
        color-scheme: dark;
      }

      body.readable-contrast-static :is(main, header, footer, section, article, nav, aside, form, dialog, [role="dialog"], [role="main"]) {
        background-color: var(--readable-contrast-background) !important;
        color: var(--readable-contrast-text) !important;
      }

      body.readable-contrast-static :is(p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, caption, label, legend, summary, dt, dd) {
        color: var(--readable-contrast-text) !important;
      }

      body.readable-contrast-static a, body.readable-contrast-static a * {
        color: var(--readable-contrast-link) !important;
        background-color: var(--readable-contrast-background) !important;
        text-decoration: underline;
      }

      body.readable-contrast-static svg {
        color: inherit !important;
      }

      body.readable-contrast-static svg :is(path, circle, rect, polygon, ellipse, text, tspan, use):not([fill="none" i]) {
        fill: currentColor !important;
      }

      body.readable-contrast-static svg :is(g, path, circle, rect, line, polyline, polygon, ellipse, text, tspan, use)[stroke]:not([stroke="none" i]) {
        stroke: currentColor !important;
      }

      body.readable-contrast-static svg[fill="none" i],
      body.readable-contrast-static svg [fill="none" i],
      body.readable-contrast-static svg[fill="none" i] *,
      body.readable-contrast-static svg [fill="none" i] * {
        fill: none !important;
      }

      body.readable-contrast-static svg[stroke="none" i],
      body.readable-contrast-static svg [stroke="none" i],
      body.readable-contrast-static svg[stroke="none" i] *,
      body.readable-contrast-static svg [stroke="none" i] * {
        stroke: none !important;
      }

      body.readable-contrast-static :disabled, body.readable-contrast-static [disabled], body.readable-contrast-static .disabled {
        color: var(--readable-contrast-disabled) !important;
      }

      body.readable-contrast-static ::selection {
        background-color: var(--readable-contrast-accent) !important;
        color: var(--readable-contrast-background) !important;
      }

      body.readable-contrast-static :is(input, textarea, select) {
        background-color: var(--readable-contrast-background) !important;
        color: var(--readable-contrast-text) !important;
        border-color: var(--readable-contrast-accent) !important;
      }

      body.readable-contrast-static button, body.readable-contrast-static [role="button"],
      body.readable-contrast-static input[type="button"], body.readable-contrast-static input[type="submit"] {
        background-color: var(--readable-contrast-background) !important;
        color: var(--readable-contrast-text) !important;
        border: 1px solid var(--readable-contrast-accent) !important;
      }

      body.readable-contrast-static *:focus {
        outline: 2px solid var(--readable-contrast-accent) !important;
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
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingAddedElements.add(node);
          }
        });

        if (!hasPendingRemovedElements) {
          hasPendingRemovedElements = Array.from(mutation.removedNodes).some(
            (node) => node.nodeType === Node.ELEMENT_NODE
          );
        }
      });

      if (hasPendingRemovedElements || pendingAddedElements.size > 0) {
        scheduleFontScaleMutationProcessing();
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

  function cacheOriginalFontSize(el, computedSizeIsScaled = false) {
    if (originalFontSizes.has(el)) return;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;

    const computedSize = parseFloat(style.fontSize);
    if (Number.isNaN(computedSize) || computedSize <= 0) return;

    const baseSize = computedSizeIsScaled ? computedSize / state.fontSize : computedSize;
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

  function restoreFontSizes() {
    originalFontSizes.forEach((original, el) => {
      restoreFontSize(el, original);
    });
    originalFontSizes.clear();
    isFontScaleCachePrimed = false;
  }

  function pruneOriginalFontSizes() {
    originalFontSizes.forEach((_, el) => {
      if (!el.isConnected) {
        originalFontSizes.delete(el);
      }
    });
  }

  function applyFontScaleToElements(elements, { computedSizeIsScaled = false } = {}) {
    elements.forEach((el) => cacheOriginalFontSize(el, computedSizeIsScaled));
    elements.forEach((el) => {
      const original = originalFontSizes.get(el);
      if (original) {
        scaleFontSize(el, original);
      }
    });
  }

  function applyFontScale() {
    if (state.fontSize === 1) {
      restoreFontSizes();
      return;
    }

    if (!isFontScaleCachePrimed) {
      applyFontScaleToElements(getScalableElements());
      isFontScaleCachePrimed = true;
      return;
    }

    pruneOriginalFontSizes();
    originalFontSizes.forEach((original, el) => {
      scaleFontSize(el, original);
    });
  }

  function applyFontScaleToAddedElements(addedElements) {
    if (state.fontSize === 1) return;

    const scopedElements = new Set();
    addedElements.forEach((el) => collectScalableElements(el, scopedElements));
    applyFontScaleToElements(scopedElements, { computedSizeIsScaled: true });
  }

  function resetPendingFontScaleMutations() {
    if (observerFrame !== null) {
      cancelAnimationFrame(observerFrame);
      observerFrame = null;
    }

    hasPendingRemovedElements = false;
    pendingAddedElements.clear();
  }

  function flushFontScaleMutations() {
    observerFrame = null;

    if (hasPendingRemovedElements) {
      pruneOriginalFontSizes();
      hasPendingRemovedElements = false;
    }

    if (pendingAddedElements.size > 0) {
      const addedElements = Array.from(pendingAddedElements);
      pendingAddedElements.clear();
      applyFontScaleToAddedElements(addedElements);
    }
  }

  function scheduleFontScaleMutationProcessing() {
    if (observerFrame !== null) return;

    observerFrame = requestAnimationFrame(flushFontScaleMutations);
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
      resetPendingFontScaleMutations();
      pruneOriginalFontSizes();
    }
  }

  function hasChangedKey(changedKeys, keys) {
    return keys.some((key) => changedKeys.has(key));
  }

  function scheduleTextAdjustmentTransition() {
    document.body.classList.add("readable-text-adjusting");

    if (textAdjustmentTimer !== null) {
      clearTimeout(textAdjustmentTimer);
    }

    textAdjustmentTimer = setTimeout(() => {
      document.body.classList.remove("readable-text-adjusting");
      textAdjustmentTimer = null;
    }, TEXT_ADJUSTMENT_TRANSITION_MS);
  }

  function enableHighContrast() {
    if (isHighContrastApplied) return;

    try {
      enableDarkReader(HIGH_CONTRAST_THEME, HIGH_CONTRAST_FIXES);
      isHighContrastApplied = true;
    } catch (error) {
      console.warn("ReadAble high contrast could not be enabled.", error);
    }
  }

  function disableHighContrast() {
    if (!isHighContrastApplied) return;

    try {
      disableDarkReader();
      isHighContrastApplied = false;
    } catch (error) {
      console.warn("ReadAble high contrast could not be disabled.", error);
    }
  }

  function clearReadableContrastClasses() {
    document.body.classList.remove("readable-contrast-static");
  }

  function applyContrastColors(colors) {
    document.documentElement.style.setProperty("--readable-contrast-background", colors.background);
    document.documentElement.style.setProperty("--readable-contrast-text", colors.text);
    document.documentElement.style.setProperty("--readable-contrast-link", colors.link);
    document.documentElement.style.setProperty("--readable-contrast-accent", colors.accent);
    document.documentElement.style.setProperty("--readable-contrast-disabled", colors.disabled);
  }

  function getCustomContrastColors() {
    return {
      background: state.customContrastBackground,
      text: state.customContrastText,
      link: state.customContrastLink,
      accent: state.customContrastAccent,
      disabled: state.customContrastDisabled,
    };
  }

  function applyStaticContrast(colors) {
    applyContrastColors(colors);
    document.body.classList.add("readable-contrast-static");
  }

  function applyHighContrast() {
    disableHighContrast();
    clearReadableContrastClasses();

    if (!state.isContrast) {
      return;
    }

    if (state.contrastMode === "dark-reader") {
      enableHighContrast();
      return;
    }

    if (state.contrastMode === "custom") {
      applyStaticContrast(getCustomContrastColors());
      return;
    }

    applyStaticContrast(SEMANTIC_CONTRAST_COLORS);
  }

  function applySettings(changedKeys, { smoothText = false } = {}) {
    if (smoothText && hasChangedKey(changedKeys, TEXT_ADJUSTMENT_KEYS)) {
      scheduleTextAdjustmentTransition();
    }

    if (changedKeys.has("isDyslexia")) {
      document.body.classList.toggle("font-dyslexic", state.isDyslexia);
    }

    if (
      hasChangedKey(changedKeys, [
        "isContrast",
        "contrastMode",
        "customContrastBackground",
        "customContrastText",
        "customContrastLink",
        "customContrastAccent",
        "customContrastDisabled",
      ])
    ) {
      applyHighContrast();
    }

    if (changedKeys.has("letterSpacing")) {
      document.body.classList.toggle("readable-letter-spacing", state.letterSpacing !== 0);
      document.documentElement.style.setProperty("--a11y-letter-spacing", `${state.letterSpacing}em`);
    }

    if (changedKeys.has("lineSpacing")) {
      document.body.classList.toggle("readable-line-spacing", state.lineSpacing !== 1.5);
      document.documentElement.style.setProperty(
        "--a11y-line-height",
        state.lineSpacing === 1.5 ? "normal" : state.lineSpacing
      );
    }

    if (changedKeys.has("fontSize")) {
      applyFontScale();
      syncObserver();
    }

    if (hasChangedKey(changedKeys, ["readingAid", "readingAidHeight", "readingAidOpacity", "readingAidColor"])) {
      applyReadingAid();
      syncPointerListener();
    }
  }

  function scheduleApplySettings() {
    if (!hasActiveSettings(state) && !isInitialized) return;

    ensureInitialized();

    if (applyFrame !== null) {
      cancelAnimationFrame(applyFrame);
    }

    applyFrame = requestAnimationFrame(() => {
      applyFrame = null;
      const changedKeys = new Set(pendingChangedKeys);
      const smoothText = shouldSmoothTextAdjustment;
      pendingChangedKeys.clear();
      shouldSmoothTextAdjustment = false;
      applySettings(changedKeys, { smoothText });
    });
  }

  function updateState(nextState, { smoothText = false } = {}) {
    let hasChangedState = false;
    let hasTextAdjustmentChange = false;

    Object.entries(nextState).forEach(([key, value]) => {
      if (Object.is(state[key], value)) return;

      state[key] = value;
      pendingChangedKeys.add(key);
      hasChangedState = true;

      if (TEXT_ADJUSTMENT_KEYS.includes(key)) {
        hasTextAdjustmentChange = true;
      }
    });

    if (hasChangedState) {
      shouldSmoothTextAdjustment = shouldSmoothTextAdjustment || (smoothText && hasTextAdjustmentChange);
      scheduleApplySettings();
    }
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
      updateState(message.settings, { smoothText: true });
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
      updateState({ fontSize: message.fontSize }, { smoothText: true });
    }
    if (message.action === "adjustLetterSpacing") {
      updateState({ letterSpacing: message.letterSpacing }, { smoothText: true });
    }
    if (message.action === "adjustLineSpacing") {
      updateState({ lineSpacing: message.lineSpacing }, { smoothText: true });
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
