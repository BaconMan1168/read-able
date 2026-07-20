export const DEFAULT_SETTINGS = {
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

export const RECOMMENDED_PRESET = {
  ...DEFAULT_SETTINGS,
  isDyslexia: true,
  fontSize: 1.15,
  letterSpacing: 0.04,
  lineSpacing: 1.65,
};
