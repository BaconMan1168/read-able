// Replace with your hosted HTTPS survey URL before publishing.
const UNINSTALL_SURVEY_URL = 'https://tally.so/r/aQP4RE';
const FUNNEL_STORAGE_KEY = 'readableFunnel';

const FUNNEL_DEFAULTS = {
  installedAt: '',
  firstRunOpened: 0,
  onboardingPresetSaved: 0,
  popupOpened: 0,
  popupPresetApplied: 0,
  readerModeStarted: 0,
  readerModeSucceeded: 0,
  readerModeFailed: 0,
};

function getUninstallSurveyUrl() {
  if (!UNINSTALL_SURVEY_URL) return '';

  try {
    const url = new URL(UNINSTALL_SURVEY_URL);
    url.searchParams.set('version', chrome.runtime.getManifest().version);
    return url.toString();
  } catch {
    return '';
  }
}

function configureUninstallSurvey() {
  const surveyUrl = getUninstallSurveyUrl();
  if (!surveyUrl) return;

  chrome.runtime.setUninstallURL(surveyUrl).catch(() => {});
}

function trackEvent(eventName) {
  if (!Object.hasOwn(FUNNEL_DEFAULTS, eventName)) return;

  chrome.storage.local.get({ [FUNNEL_STORAGE_KEY]: FUNNEL_DEFAULTS }, (result) => {
    const currentFunnel = {
      ...FUNNEL_DEFAULTS,
      ...result[FUNNEL_STORAGE_KEY],
    };

    chrome.storage.local.set({
      [FUNNEL_STORAGE_KEY]: {
        ...currentFunnel,
        [eventName]: Number(currentFunnel[eventName] || 0) + 1,
        lastEventAt: new Date().toISOString(),
      },
    });
  });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  configureUninstallSurvey();

  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({
      [FUNNEL_STORAGE_KEY]: {
        ...FUNNEL_DEFAULTS,
        installedAt: new Date().toISOString(),
        firstRunOpened: 1,
      },
    });

    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding.html'),
    });
  }
});

chrome.runtime.onStartup.addListener(configureUninstallSurvey);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === 'trackFunnelEvent') {
    trackEvent(message.eventName);
  }
});
