import { useState } from 'react'
import './App.css'

function App() {
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const [fontSize, setFontSize] = useState(16);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineSpacing, setLineSpacing] = useState(1.5);


  function toggleDyslexiaFont(checked){
    setDyslexiaFont(checked);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "toggleDyslexiaFont",
        enabled: checked
      })
    })
  }

  function toggleHighContrast(checked){
    setHighContrast(checked);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "toggleHighContrast",
        enabled: checked
      })
    })
  }

  function adjustFontSize(value){
    setFontSize(value);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "adjustFontSize",
        fontSize: value
      })
    })
  }

  function adjustLetterSpacing(value){
    setLetterSpacing(value);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "adjustLetterSpacing",
        letterSpacing: value
      })
    })
  }

  function adjustLineSpacing(value){
    setLineSpacing(value);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "adjustLineSpacing",
        lineSpacing: value
      })
    })
  }

  return (
    <>
      <header>
        <h1>ReadAble</h1>
        <h2>Accessible Reading Tools</h2>
      </header>
      <main>
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
