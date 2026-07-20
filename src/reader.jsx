/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_SETTINGS } from './settings.js';
import './reader.css';

const SITE_SETTINGS_KEY = 'siteSettings';
const STORAGE_DEFAULTS = {
  ...DEFAULT_SETTINGS,
  [SITE_SETTINGS_KEY]: {},
};
const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS);

function getReaderKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') ? `readableReader:${params.get('id')}` : '';
}

function getHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
}

function getGlobalSettings(storedSettings) {
  const settings = {};

  SETTINGS_KEYS.forEach((key) => {
    settings[key] = storedSettings[key];
  });

  return normalizeSettings(settings);
}

function normalizeSiteSettings(siteSettings) {
  return siteSettings && typeof siteSettings === 'object' && !Array.isArray(siteSettings)
    ? siteSettings
    : {};
}

function getEffectiveSettings(storedSettings, domain) {
  const storedSiteSettings = normalizeSiteSettings(storedSettings[SITE_SETTINGS_KEY]);
  const domainSettings = domain ? storedSiteSettings[domain] : null;

  return domainSettings ? normalizeSettings(domainSettings) : getGlobalSettings(storedSettings);
}

function getContrastColors(settings) {
  if (!settings.isContrast) {
    return {
      background: '#f7f7f2',
      text: '#24251f',
      link: '#175ea8',
      accent: '#2f6f9f',
    };
  }

  if (settings.contrastMode === 'dark-reader') {
    return {
      background: '#000000',
      text: '#ffffff',
      link: '#ffffff',
      accent: '#ffffff',
      colorScheme: 'dark',
    };
  }

  if (settings.contrastMode === 'custom') {
    return {
      background: settings.customContrastBackground,
      text: settings.customContrastText,
      link: settings.customContrastLink,
      accent: settings.customContrastAccent,
      colorScheme: 'dark',
    };
  }

  return {
    background: '#000000',
    text: '#ffffff',
    link: '#fffe00',
    accent: '#19ebfe',
    colorScheme: 'dark',
  };
}

function sanitizeArticleContent(content) {
  const template = document.createElement('template');
  template.innerHTML = content;

  template.content
    .querySelectorAll('script, style, link, meta, object, embed, form, input, button, textarea, select')
    .forEach((element) => element.remove());

  template.content.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on') || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
}

function applyReaderSettings(settings) {
  const colors = getContrastColors(settings);
  const root = document.documentElement;

  root.style.setProperty('--reader-bg', colors.background);
  root.style.setProperty('--reader-text', colors.text);
  root.style.setProperty('--reader-link', colors.link);
  root.style.setProperty('--reader-accent', colors.accent);
  root.style.setProperty('--reader-font-size', `${18 * settings.fontSize}px`);
  root.style.setProperty('--reader-letter-spacing', `${settings.letterSpacing}em`);
  root.style.setProperty('--reader-line-height', settings.lineSpacing === 1.5 ? '1.5' : String(settings.lineSpacing));
  document.body.classList.toggle('reader-font-dyslexic', settings.isDyslexia);
  document.body.classList.toggle('reader-contrast', Boolean(colors.colorScheme));
  document.body.style.colorScheme = colors.colorScheme || 'light';
}

function ReaderApp() {
  const [article, setArticle] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const currentDomain = useRef('');

  useEffect(() => {
    const readerKey = getReaderKey();

    const loadSettings = () => {
      chrome.storage.sync.get(STORAGE_DEFAULTS, (storedSettings) => {
        setSettings(getEffectiveSettings(storedSettings, currentDomain.current));
      });
    };

    if (!readerKey) {
      setError('Reader Mode could not find this article.');
      return;
    }

    chrome.storage.session.get(readerKey, (result) => {
      const storedArticle = result[readerKey];

      if (!storedArticle) {
        setError('Reader Mode could not find this article. Return to the page and try again.');
        return;
      }

      currentDomain.current = getHostname(storedArticle.url);
      setArticle(storedArticle);
      loadSettings();
    });

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'sync') return;

      const hasSettingsChange = Object.keys(changes).some(
        (key) => SETTINGS_KEYS.includes(key) || key === SITE_SETTINGS_KEY
      );

      if (hasSettingsChange) {
        loadSettings();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    applyReaderSettings(settings);
  }, [settings]);

  const safeContent = useMemo(() => sanitizeArticleContent(article?.content || ''), [article]);

  if (error) {
    return (
      <main className="reader-shell reader-state">
        <p>{error}</p>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="reader-shell reader-state">
        <p>Loading Reader Mode...</p>
      </main>
    );
  }

  return (
    <main className="reader-shell">
      <a className="reader-source" href={article.url}>
        {new URL(article.url).hostname}
      </a>
      <h1>{article.title}</h1>
      {(article.byline || article.publishedTime) && (
        <p className="reader-meta">
          {[article.byline, article.publishedTime].filter(Boolean).join(' - ')}
        </p>
      )}
      <article className="reader-content" dangerouslySetInnerHTML={{ __html: safeContent }} />
    </main>
  );
}

createRoot(document.getElementById('reader-root')).render(
  <StrictMode>
    <ReaderApp />
  </StrictMode>,
);
