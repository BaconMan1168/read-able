import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(1); 
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineSpacing, setLineSpacing] = useState(1.5);

  useEffect(() => {
    chrome.storage.sync.get(
      {
        isDyslexia: false,
        isContrast: false,
        fontSize: 1,
        letterSpacing: 0,
        lineSpacing: 1.5
      },
      (result) => {
        setDyslexiaFont(result.isDyslexia);
        setHighContrast(result.isContrast);
        setFontSize(result.fontSize);
        setLetterSpacing(result.letterSpacing);
        setLineSpacing(result.lineSpacing);
      }
    );
  }, []);

  const sendMessageToTab = (message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
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

  const adjustFontSize = (value) => {
    setFontSize(value);
    chrome.storage.sync.set({ fontSize: value });
    sendMessageToTab({ action: "adjustFontSize", fontSize: value });
  };

  const adjustLetterSpacing = (value) => {
    setLetterSpacing(value);
    chrome.storage.sync.set({ letterSpacing: value });
    sendMessageToTab({ action: "adjustLetterSpacing", letterSpacing: value });
  };

  const adjustLineSpacing = (value) => {
    setLineSpacing(value);
    chrome.storage.sync.set({ lineSpacing: value });
    sendMessageToTab({ action: "adjustLineSpacing", lineSpacing: value });
  };

  const requestPermissionForCurrentSite = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const origin = url.origin + "/*";

      chrome.permissions.request({ origins: [origin] }, (granted) => {
        if (granted) {
          console.log("Permission granted for " + origin);

          // Inject content.js
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"]
          }, () => {
            sendMessageToTab({
              action: "applyCurrentSettings",
              settings: { dyslexiaFont, highContrast, fontSize, letterSpacing, lineSpacing }
            });
          });

        } else {
          console.log("Permission denied for " + origin);
        }
      });
    });
  };

  return (
    <>
      <header>
        <h1>ReadAble</h1>
        <h2>Accessible Reading Tools</h2>
      </header>
      <main>
        <button className="request-button" onClick={requestPermissionForCurrentSite}>
          Enable ReadAble on this Site
        </button>

        <section className="switch-section">
          <div className="switch-group">
            <span>Toggle Dyslexia Font</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={dyslexiaFont}
                onChange={(e) => toggleDyslexiaFont(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="switch-group">
            <span>Toggle High Contrast</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => toggleHighContrast(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

        <section className="slide-section">
          <div className="slide-container">
            <label>Font Scale: {fontSize}×</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={fontSize}
              onChange={(e) => adjustFontSize(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="slide-container">
            <label>Letter Spacing: {letterSpacing}em</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={letterSpacing}
              onChange={(e) => adjustLetterSpacing(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="slide-container">
            <label>Line Spacing: {lineSpacing}</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={lineSpacing}
              onChange={(e) => adjustLineSpacing(Number(e.target.value))}
              className="range-slider"
            />
          </div>
        </section>
      </main>
    </>
  );
}

export default App;