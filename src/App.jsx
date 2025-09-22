import { useState } from 'react'
import './App.css'

function App() {
  const [dyslexiaFont, setDyslexiaFont] = useState(chrome.storage.sync.get({isDyslexia}) || false);
  const [highContrast, setHighContrast] = useState(chrome.storage.sync.get({isContrast}) || false);

  const [fontSize, setFontSize] = useState(chrome.storage.sync.get({fontSize}) || 16);
  const [letterSpacing, setLetterSpacing] = useState(chrome.storage.sync.get({letterSpacing}) || 0);
  const [lineSpacing, setLineSpacing] = useState(chrome.storage.sync.get({lineSpacing}),  1.5);


  function toggleDyslexiaFont(checked){
    setDyslexiaFont(checked);
    chrome.storage.sync.set({isDyslexia: checked});
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "toggleDyslexiaFont",
        enabled: checked
      })
    })
  }

  function toggleHighContrast(checked){
    setHighContrast(checked);
    chrome.storage.sync.set({isContrast: checked});
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "toggleHighContrast",
        enabled: checked
      })
    })
  }

  function adjustFontSize(value){
    setFontSize(value);
    chrome.storage.sync.set({fontSize: value});
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "adjustFontSize",
        fontSize: value
      })
    })
  }

  function adjustLetterSpacing(value){
    setLetterSpacing(value);
    chrome.storage.sync.set({letterSpacing: value});
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "adjustLetterSpacing",
        letterSpacing: value
      })
    })
  }

  function adjustLineSpacing(value){
    setLineSpacing(value);
    chrome.storage.sync.set({lineSpacing: value});
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "adjustLineSpacing",
        lineSpacing: value
      })
    })
  }

  function requestPermissionForCurrentSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const origin = url.origin + "/*";

      chrome.permissions.request({ origins: [origin] }, (granted) => {
        if (granted) {
          console.log("Permission granted for " + origin);


          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"]
          });
        } else {
          console.log("Permission denied for " + origin);
        }
      });
    });
  }

  return (
    <>
      <header>
        <h1>ReadAble</h1>
        <h2>Accessible Reading Tools</h2>
      </header>
      <main>
        <button onClick={requestPermissionForCurrentSite}>Enable ReadAble on this Site</button>
        <section>
          <div>
            <label className="switch">
              Dyslexia Font
              <input
                type="checkbox"
                checked={dyslexiaFont}
                onChange={(e) => toggleDyslexiaFont(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div>
            <label className="switch">
              High Contrast
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => toggleHighContrast(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

        <section>
          <div className="sliderContainer">
            <label>Font Size: {fontSize}px</label>
            <input
              type="range"
              min="12"
              max="32"
              value={fontSize}
              onChange={(e) => adjustFontSize(Number(e.target.value))}
            />
          </div>

          <div className="sliderContainer">
            <label>Letter Spacing: {letterSpacing}em</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={letterSpacing}
              onChange={(e) => adjustLetterSpacing(Number(e.target.value))}
            />
          </div>

          <div className="sliderContainer">
            <label>Line Spacing: {lineSpacing}</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={lineSpacing}
              onChange={(e) => adjustLineSpacing(Number(e.target.value))}
            />
          </div>
        </section>
      </main>
    </>
  )
}

export default App;
