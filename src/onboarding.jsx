/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RECOMMENDED_PRESET } from './settings.js';
import './onboarding.css';

function trackFunnelEvent(eventName) {
  chrome.runtime.sendMessage({ action: 'trackFunnelEvent', eventName }, () => {
    void chrome.runtime.lastError;
  });
}

function OnboardingApp() {
  const [isSaved, setIsSaved] = useState(false);
  const [message, setMessage] = useState('');

  const saveRecommendedPreset = () => {
    chrome.storage.sync.set(RECOMMENDED_PRESET, () => {
      if (chrome.runtime.lastError) {
        setMessage('ReadAble could not save the preset. Try again from the toolbar popup.');
        return;
      }

      setIsSaved(true);
      trackFunnelEvent('onboardingPresetSaved');
      setMessage('Recommended preset saved. Open the toolbar popup any time to customize it.');
    });
  };

  return (
    <main className="setup-shell">
      <section className="setup-panel" aria-labelledby="setupTitle">
        <p className="setup-kicker">First-run setup</p>
        <h1 id="setupTitle">Make pages readable in one click.</h1>
        <p className="setup-copy">
          Start with a mild preset designed to improve readability without heavily changing page layout.
        </p>

        <div className="preset-summary" aria-label="Recommended preset settings">
          <span>OpenDyslexic font</span>
          <span>115% text</span>
          <span>1.65 line spacing</span>
          <span>Light letter spacing</span>
        </div>

        <div className="setup-actions">
          <button type="button" onClick={saveRecommendedPreset} disabled={isSaved}>
            {isSaved ? 'Preset saved' : 'Use recommended preset'}
          </button>
          <a href="index.html">Customize instead</a>
        </div>

        {message && (
          <p className="setup-message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="preview-panel" aria-label="Reading preview">
        <p className="preview-label">Preview</p>
        <article>
          <h2>Readable text should feel calmer, not louder.</h2>
          <p>
            This preset gently increases size, spacing, and line height while leaving contrast and reading aids off
            until you choose them.
          </p>
          <p>
            It is intentionally mild so article pages, school resources, and everyday websites remain familiar.
          </p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('onboarding-root')).render(
  <StrictMode>
    <OnboardingApp />
  </StrictMode>,
);
