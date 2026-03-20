const toggle     = document.getElementById('mainToggle');
const statusText = document.getElementById('statusText');
const infoText   = document.getElementById('infoText');
const infoIcon   = document.getElementById('infoIcon');
const card       = document.getElementById('toggleCard');

function applyUI(enabled) {
  toggle.checked = enabled;

  if (enabled) {
    statusText.textContent = 'Shorts are hidden';
    statusText.className   = 'toggle-status on';
    infoText.textContent   = 'Shorts are blocked on all YouTube pages.';
    infoIcon.className     = 'info-icon active';
    card.classList.add('active');
  } else {
    statusText.textContent = 'Shorts are visible';
    statusText.className   = 'toggle-status';
    infoText.textContent   = 'Toggle on to hide Shorts across YouTube.';
    infoIcon.className     = 'info-icon';
    card.classList.remove('active');
  }
}

chrome.storage.local.get(['fokasEnabled'], (result) => {
  const enabled = result.fokasEnabled !== undefined ? result.fokasEnabled : false;
  applyUI(enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;

  chrome.storage.local.set({ fokasEnabled: enabled }, () => {
    applyUI(enabled);

    chrome.tabs.query({ url: 'https://www.youtube.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: 'FOKAS_TOGGLE', enabled })
          .catch(() => {});
      });
    });
  });
});
