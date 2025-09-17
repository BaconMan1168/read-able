import { useState } from 'react'
import './App.css'

function App() {
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const [fontSize, setFontSize] = useState(16);
  const [letterSpacing, setLetterSpacing] = useState(1);
  const [lineSpacing, setLineSpacing] = useState(1.5);

  const [profile, setProfile] = useState('');

  function toggleDyslexiaFont(checked){
    setDyslexiaFont(checked);
    chrome.tabs.query({active: "true"}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "toggleDyslexiaFont",
        enabled: checked
      })
    })
  }

  function toggleHighContrast(checked){
    setHighContrast(checked);
    chrome.tabs.query({active: "true"}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0], {
        action: "toggleHighContrast",
        enabled: checked
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
              onChange={(e) => setFontSize(Number(e.target.value))}
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
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
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
              onChange={(e) => setLineSpacing(Number(e.target.value))}
            />
          </div>
        </section>

        <section>
          <label htmlFor="profile-select">Profile:</label>
          <select
            id="profile-select"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
          >
            <option value="">Choose a profile</option>
          </select>
        </section>
      </main>
    </>
  )
}

export default App;
