import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(1); 
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineSpacing, setLineSpacing] = useState(1.5);

  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  const [currentDomain, setCurrentDomain] = useState("");

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        setCurrentDomain(domain);

        chrome.storage.sync.get(
          {
            isDyslexia: false,
            isContrast: false,
            fontSize: 1,
            letterSpacing: 0,
            lineSpacing: 1.5,
            disabledSites: [] 
          },
          (result) => {
            setDyslexiaFont(result.isDyslexia);
            setHighContrast(result.isContrast);
            setFontSize(result.fontSize);
            setLetterSpacing(result.letterSpacing);
            setLineSpacing(result.lineSpacing);
            setIsSiteDisabled(result.disabledSites.includes(domain));
          }
        );
      }
    });
  }, []);

  const sendMessageToTab = (message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  };

  const toggleSiteDisable = (checked) => {
    chrome.storage.sync.get({ disabledSites: [] }, (result) => {
      let list = result.disabledSites;
      if (checked) {
        if (!list.includes(currentDomain)) list.push(currentDomain);
      } else {
        list = list.filter(site => site !== currentDomain);
      }
      
      chrome.storage.sync.set({ disabledSites: list }, () => {
        setIsSiteDisabled(checked);
        chrome.tabs.reload();
      });
    });
  };

  const toggleDyslexiaFont = (checked) => {
    setDyslexiaFont(checked);
    chrome.storage.sync.set({ isDyslexia: checked });
    sendMessageToTab({ action: "toggleDyslexicFont", enabled: checked });
  };

  const toggleHighContrast = (checked) => {
    setHighContrast(checked);
    chrome.storage.sync.set({ isContrast: checked });
    sendMessageToTab({ action: "toggleHighContrast", enabled: checked });
  };

  const fontScaleMax = dyslexiaFont ? 1.35 : 2;
  const letterSpacingMax = dyslexiaFont ? 0.4 : 0.5;

  return (
    <>
      <header>
        <h1>ReadAble</h1>
        <h2>Accessible Reading Tools</h2>
      </header>
      <main>
        <section className="switch-section" aria-label="Accessibility toggles">
          <div className="switch-group">
            <span id="siteToggleLabel">Disable ReadAble on this Site</span>
            <label htmlFor="siteToggle" className="switch">
              <input
                id="siteToggle"
                type="checkbox"
                checked={isSiteDisabled}
                onChange={(e) => toggleSiteDisable(e.target.checked)}
                aria-checked={isSiteDisabled}
                aria-labelledby="siteToggleLabel"
              />
              <span className="slider round" role="presentation"></span>
            </label>
          </div>

          <div className="switch-group">
            <span id="dyslexiaFontLabel">Toggle OpenDyslexic Font</span>
            <label htmlFor="dyslexiaFont" className="switch">
              <input
                id="dyslexiaFont"
                type="checkbox"
                checked={dyslexiaFont}
                onChange={(e) => toggleDyslexiaFont(e.target.checked)}
                aria-checked={dyslexiaFont}
                aria-labelledby="dyslexiaFontLabel"
              />
              <span className="slider round" role="presentation"></span>
            </label>
          </div>

          <div className="switch-group">
            <span id="highContrastLabel">Toggle High Contrast</span>
            <label htmlFor='highContrast' className="switch">
              <input
                id='highContrast'
                type="checkbox"
                checked={highContrast}
                onChange={(e) => toggleHighContrast(e.target.checked)}
                aria-checked={highContrast}
                aria-labelledby="highContrastLabel"
              />
              <span className="slider round" role="presentation"></span>
            </label>
          </div>
        </section>

        <section className="slide-section" aria-label="Adjustable text settings">
          <div className="slide-container">
            <label htmlFor="fontScale">Font Scale: {fontSize}×</label>
            <input
              id="fontScale"
              type="range"
              min="0.5"
              max={fontScaleMax}
              step="0.05"
              value={fontSize}
              onChange={(e) => {
                const value = Number(e.target.value);
                setFontSize(value);
                sendMessageToTab({ action: "adjustFontSize", fontSize: value });
              }}
              onBlur={(e) => {
                const value = Number(e.target.value);
                chrome.storage.sync.set({ fontSize: value });
              }}
              className="range-slider"
              aria-valuemin={0.5}
              aria-valuemax={2}
              aria-valuenow={fontSize}
              aria-valuetext={`Font size ${fontSize} times normal`}
              aria-label="Adjust font size"
            />
          </div>

          <div className="slide-container">
            <label htmlFor="letterSpacing">Letter Spacing: {letterSpacing}em</label>
            <input
              id="letterSpacing"
              type="range"
              min="0"
              max={letterSpacingMax}
              step="0.01"
              value={letterSpacing}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLetterSpacing(value);
                sendMessageToTab({ action: "adjustLetterSpacing", letterSpacing: value });
              }}
              onBlur={(e) => {
                const value = Number(e.target.value);
                chrome.storage.sync.set({ letterSpacing: value });
              }}
              className="range-slider"
              aria-valuemin={0}
              aria-valuemax={0.5}
              aria-valuenow={letterSpacing}
              aria-valuetext={`Letter spacing ${letterSpacing} em`}
              aria-label="Adjust letter spacing"
            />
          </div>

          <div className="slide-container">
            <label htmlFor="lineSpacing">Line Spacing: {lineSpacing}</label>
            <input
              id="lineSpacing"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={lineSpacing}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLineSpacing(value);
                sendMessageToTab({ action: "adjustLineSpacing", lineSpacing: value });
              }}
              onBlur={(e) => {
                const value = Number(e.target.value);
                chrome.storage.sync.set({ lineSpacing: value });
              }}
              className="range-slider"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={lineSpacing}
              aria-valuetext={`Line spacing ${lineSpacing}`}
              aria-label="Adjust line spacing"
            />
          </div>
        </section>
      </main>
    </>
  );
}

export default App;