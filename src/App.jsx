import { useEffect, useRef, useState } from 'react';
import './App.css';

const DEFAULT_SETTINGS = {
  isDyslexia: false,
  isContrast: false,
  fontSize: 1,
  letterSpacing: 0,
  lineSpacing: 1.5,
  readingAid: 'none',
  readingAidHeight: 72,
  readingAidOpacity: 0.24,
  readingAidColor: '#ffe066',
};

const SUPPORTED_PROTOCOLS = ['http:', 'https:', 'file:'];
const PAUSED_SITE_RULES = [
  { host: 'docs.google.com' },
  { host: 'drive.google.com' },
  { host: 'mail.google.com' },
  { host: 'calendar.google.com' },
  { host: 'keep.google.com' },
  { host: 'meet.google.com' },
  { host: 'chat.google.com' },
  { host: 'classroom.google.com' },
  { host: 'notion.so' },
  { host: 'figma.com' },
  { host: 'canva.com' },
  { host: 'overleaf.com' },
  { host: 'codepen.io' },
  { host: 'codesandbox.io' },
  { host: 'stackblitz.com' },
  { host: 'replit.com' },
  { host: 'glitch.com' },
  { host: 'jsfiddle.net' },
  { host: 'github.dev' },
  { host: 'vscode.dev' },
  { host: 'office.com' },
  { host: 'microsoft365.com' },
  { host: 'officeapps.live.com' },
  { host: 'sharepoint.com' },
  { host: 'onedrive.live.com' },
];

function isSupportedTabUrl(tabUrl) {
  if (!tabUrl) return false;

  try {
    const url = new URL(tabUrl);
    return SUPPORTED_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
}

function hostMatches(hostname, ruleHost) {
  return hostname === ruleHost || hostname.endsWith(`.${ruleHost}`);
}

function isPausedTabUrl(tabUrl) {
  if (!tabUrl) return false;

  try {
    const url = new URL(tabUrl);
    const hostname = url.hostname.toLowerCase();
    return PAUSED_SITE_RULES.some((rule) => hostMatches(hostname, rule.host));
  } catch {
    return false;
  }
}

function isDisabledDomain(hostname, disabledSites) {
  return disabledSites.some((site) => hostMatches(hostname, site.toLowerCase()));
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');
  const [activeTabId, setActiveTabId] = useState(null);
  const [isUnsupportedPage, setIsUnsupportedPage] = useState(false);
  const [isPausedSite, setIsPausedSite] = useState(false);
  const [messageError, setMessageError] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      if (!tab || !isSupportedTabUrl(tab.url)) {
        setIsUnsupportedPage(true);
        chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
          setSettings(result);
        });
        return;
      }

      const url = new URL(tab.url);
      const domain = url.hostname;
      setActiveTabId(tab.id);
      setCurrentDomain(domain);
      setIsPausedSite(isPausedTabUrl(tab.url));

      chrome.storage.sync.get(
        {
          ...DEFAULT_SETTINGS,
          disabledSites: [],
        },
        (result) => {
          const { disabledSites, ...storedSettings } = result;
          setSettings(storedSettings);
          setIsSiteDisabled(isDisabledDomain(domain, disabledSites));
        }
      );
    });

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const saveSettings = (nextSettings) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      chrome.storage.sync.set(nextSettings);
    }, 150);
  };

  const sendSettingsToTab = (nextSettings) => {
    if (activeTabId === null || isUnsupportedPage || isSiteDisabled || isPausedSite) return;

    const message = {
      action: 'updateSettings',
      settings: nextSettings,
    };

    const sendMessage = (allowInject) => {
      chrome.tabs.sendMessage(
        activeTabId,
        message,
        () => {
          if (!chrome.runtime.lastError) {
            setMessageError('');
            return;
          }

          if (!allowInject) {
            setMessageError('ReadAble could not run on this page.');
            return;
          }

          chrome.scripting.executeScript(
            {
              target: { tabId: activeTabId },
              files: ['content.js'],
            },
            () => {
              if (chrome.runtime.lastError) {
                setMessageError('ReadAble could not run on this page.');
                return;
              }

              sendMessage(false);
            }
          );
        }
      );
    };

    sendMessage(true);
  };

  const updateSettings = (partialSettings) => {
    const nextSettings = { ...settings, ...partialSettings };
    setSettings(nextSettings);
    saveSettings(partialSettings);
    sendSettingsToTab(nextSettings);
  };

  const toggleSiteDisable = (checked) => {
    if (!currentDomain) return;

    chrome.storage.sync.get({ disabledSites: [] }, (result) => {
      let list = result.disabledSites;
      if (checked) {
        if (!list.includes(currentDomain)) list = [...list, currentDomain];
      } else {
        list = list.filter((site) => site !== currentDomain);
      }

      chrome.storage.sync.set({ disabledSites: list }, () => {
        setIsSiteDisabled(checked);
        if (activeTabId !== null) {
          chrome.tabs.reload(activeTabId);
        }
      });
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    chrome.storage.sync.set(DEFAULT_SETTINGS);
    sendSettingsToTab(DEFAULT_SETTINGS);
  };

  const controlsDisabled = isUnsupportedPage || isSiteDisabled || isPausedSite;
  const fontScaleMax = settings.isDyslexia ? 1.35 : 2;
  const letterSpacingMax = settings.isDyslexia ? 0.4 : 0.5;

  return (
    <>
      <header>
        <h1>ReadAble</h1>
        <h2>Accessible Reading Tools</h2>
      </header>
      <main>
        {isUnsupportedPage && (
          <p className="status-message">
            ReadAble cannot run on this page.
          </p>
        )}
        {isPausedSite && (
          <p className="status-message">
            ReadAble is paused on editors and web apps to avoid breaking them.
          </p>
        )}
        {messageError && (
          <p className="status-message">
            {messageError}
          </p>
        )}

        <section className="switch-section" aria-label="Accessibility toggles">
          <div className="switch-group">
            <span id="siteToggleLabel">Disable on this Site</span>
            <label htmlFor="siteToggle" className="switch">
              <input
                id="siteToggle"
                type="checkbox"
                checked={isSiteDisabled || isPausedSite}
                disabled={isUnsupportedPage || isPausedSite || !currentDomain}
                onChange={(e) => toggleSiteDisable(e.target.checked)}
                aria-checked={isSiteDisabled || isPausedSite}
                aria-labelledby="siteToggleLabel"
              />
              <span className="slider round" role="presentation"></span>
            </label>
          </div>

          <div className="switch-group">
            <span id="dyslexiaFontLabel">OpenDyslexic Font</span>
            <label htmlFor="dyslexiaFont" className="switch">
              <input
                id="dyslexiaFont"
                type="checkbox"
                checked={settings.isDyslexia}
                disabled={controlsDisabled}
                onChange={(e) => updateSettings({ isDyslexia: e.target.checked })}
                aria-checked={settings.isDyslexia}
                aria-labelledby="dyslexiaFontLabel"
              />
              <span className="slider round" role="presentation"></span>
            </label>
          </div>

          <div className="switch-group">
            <span id="highContrastLabel">High Contrast</span>
            <label htmlFor="highContrast" className="switch">
              <input
                id="highContrast"
                type="checkbox"
                checked={settings.isContrast}
                disabled={controlsDisabled}
                onChange={(e) => updateSettings({ isContrast: e.target.checked })}
                aria-checked={settings.isContrast}
                aria-labelledby="highContrastLabel"
              />
              <span className="slider round" role="presentation"></span>
            </label>
          </div>
        </section>

        <section className="slide-section" aria-label="Adjustable text settings">
          <div className="slide-container">
            <label htmlFor="fontScale">Font Scale: {settings.fontSize}x</label>
            <input
              id="fontScale"
              type="range"
              min="0.5"
              max={fontScaleMax}
              step="0.05"
              value={settings.fontSize}
              disabled={controlsDisabled}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="range-slider"
              aria-valuemin={0.5}
              aria-valuemax={fontScaleMax}
              aria-valuenow={settings.fontSize}
              aria-valuetext={`Font size ${settings.fontSize} times normal`}
              aria-label="Adjust font size"
            />
          </div>

          <div className="slide-container">
            <label htmlFor="letterSpacing">Letter Spacing: {settings.letterSpacing}em</label>
            <input
              id="letterSpacing"
              type="range"
              min="0"
              max={letterSpacingMax}
              step="0.01"
              value={settings.letterSpacing}
              disabled={controlsDisabled}
              onChange={(e) => updateSettings({ letterSpacing: Number(e.target.value) })}
              className="range-slider"
              aria-valuemin={0}
              aria-valuemax={letterSpacingMax}
              aria-valuenow={settings.letterSpacing}
              aria-valuetext={`Letter spacing ${settings.letterSpacing} em`}
              aria-label="Adjust letter spacing"
            />
          </div>

          <div className="slide-container">
            <label htmlFor="lineSpacing">Line Spacing: {settings.lineSpacing}</label>
            <input
              id="lineSpacing"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={settings.lineSpacing}
              disabled={controlsDisabled}
              onChange={(e) => updateSettings({ lineSpacing: Number(e.target.value) })}
              className="range-slider"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={settings.lineSpacing}
              aria-valuetext={`Line spacing ${settings.lineSpacing}`}
              aria-label="Adjust line spacing"
            />
          </div>
        </section>

        <section className="control-section" aria-label="Reading aid settings">
          <label htmlFor="readingAid">Reading Aid</label>
          <select
            id="readingAid"
            value={settings.readingAid}
            disabled={controlsDisabled}
            onChange={(e) => updateSettings({ readingAid: e.target.value })}
          >
            <option value="none">None</option>
            <option value="ruler">Ruler</option>
            <option value="focus">Focus mask</option>
          </select>

          {settings.readingAid !== 'none' && (
            <>
              <div className="slide-container">
                <label htmlFor="readingAidHeight">Aid Height: {settings.readingAidHeight}px</label>
                <input
                  id="readingAidHeight"
                  type="range"
                  min="32"
                  max="180"
                  step="4"
                  value={settings.readingAidHeight}
                  disabled={controlsDisabled}
                  onChange={(e) => updateSettings({ readingAidHeight: Number(e.target.value) })}
                  className="range-slider"
                  aria-label="Adjust reading aid height"
                />
              </div>

              <div className="slide-container">
                <label htmlFor="readingAidOpacity">Aid Opacity: {settings.readingAidOpacity}</label>
                <input
                  id="readingAidOpacity"
                  type="range"
                  min="0.1"
                  max="0.7"
                  step="0.02"
                  value={settings.readingAidOpacity}
                  disabled={controlsDisabled}
                  onChange={(e) => updateSettings({ readingAidOpacity: Number(e.target.value) })}
                  className="range-slider"
                  aria-label="Adjust reading aid opacity"
                />
              </div>

              {settings.readingAid === 'ruler' && (
                <div className="color-control">
                  <label htmlFor="readingAidColor">Aid Color</label>
                  <input
                    id="readingAidColor"
                    type="color"
                    value={settings.readingAidColor}
                    disabled={controlsDisabled}
                    onChange={(e) => updateSettings({ readingAidColor: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </section>

        <button
          type="button"
          className="reset-button"
          disabled={controlsDisabled}
          onClick={resetSettings}
        >
          Reset all
        </button>
      </main>
    </>
  );
}

export default App;
