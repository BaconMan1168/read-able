/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './reader.css';

const DEFAULT_SETTINGS = {
  isDyslexia: false,
  isContrast: false,
  contrastMode: 'semantic',
  customContrastBackground: '#000000',
  customContrastText: '#ffffff',
  customContrastLink: '#fffe00',
  customContrastAccent: '#19ebfe',
  customContrastDisabled: '#3ef240',
  fontSize: 1,
  letterSpacing: 0,
  lineSpacing: 1.5,
  readingAid: 'none',
  readingAidHeight: 72,
  readingAidOpacity: 0.24,
  readingAidColor: '#ffe066',
};

function getReaderKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') ? `readableReader:${params.get('id')}` : '';
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

  if (settings.contrastMode === 'custom') {
    return {
      background: settings.customContrastBackground,
      text: settings.customContrastText,
      link: settings.customContrastLink,
      accent: settings.customContrastAccent,
    };
  }

  return {
    background: '#000000',
    text: '#ffffff',
    link: '#fffe00',
    accent: '#19ebfe',
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
  document.body.classList.toggle('reader-contrast', settings.isContrast);
}

function ReaderApp() {
  const [article, setArticle] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');

  useEffect(() => {
    const readerKey = getReaderKey();

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

      setArticle(storedArticle);
    });

    chrome.storage.sync.get(DEFAULT_SETTINGS, (storedSettings) => {
      setSettings(storedSettings);
    });

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'sync') return;

      setSettings((currentSettings) => {
        const nextSettings = { ...currentSettings };
        Object.entries(changes).forEach(([key, change]) => {
          if (key in DEFAULT_SETTINGS) {
            nextSettings[key] = change.newValue;
          }
        });
        return nextSettings;
      });
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
