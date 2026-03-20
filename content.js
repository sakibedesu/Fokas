let isEnabled = false;
let observer = null;
let scanTimer = null;
let isScanning = false;

const STYLE_ID = 'fokas-style';

const SHORTS_CSS = `
  ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]) {
    display: none !important;
  }
  ytd-guide-entry-renderer:has(a[href^="/shorts"]) {
    display: none !important;
  }
  ytm-shorts-lockup-view-model,
  ytm-shorts-lockup-view-model-v2,
  ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model),
  ytd-rich-grid-row:has(ytm-shorts-lockup-view-model),
  ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model),
  grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
  yt-horizontal-list-renderer:has(ytm-shorts-lockup-view-model) {
    display: none !important;
  }
  ytd-reel-shelf-renderer,
  ytm-reel-shelf-renderer,
  ytd-rich-shelf-renderer[is-shorts],
  ytd-rich-section-renderer:has(ytd-reel-shelf-renderer) {
    display: none !important;
  }
  ytd-video-renderer:has(a[href^="/shorts/"]) {
    display: none !important;
  }
  yt-chip-cloud-chip-renderer:has(a[href*="sp=EgIQAQ"]) {
    display: none !important;
  }
  ytd-shorts,
  ytd-page-manager[page-name="shorts"] {
    display: none !important;
  }
`;

function injectCSS() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SHORTS_CSS;
  (document.head || document.documentElement).appendChild(style);
}

function removeCSS() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

function hide(el) {
  if (!el || el.hasAttribute('data-fokas-hidden')) return;
  el.setAttribute('data-fokas-hidden', '1');
  el.style.setProperty('display', 'none', 'important');
}

function unhideAll() {
  document.querySelectorAll('[data-fokas-hidden]').forEach(el => {
    el.style.removeProperty('display');
    el.removeAttribute('data-fokas-hidden');
  });
}

function scan() {
  if (!isEnabled || isScanning) return;
  isScanning = true;
  try {
    document.querySelectorAll('ytd-mini-guide-entry-renderer, ytd-guide-entry-renderer').forEach(entry => {
      if (entry.hasAttribute('data-fokas-hidden')) return;
      const a = entry.querySelector('a[href]');
      if (a && a.getAttribute('href').startsWith('/shorts')) { hide(entry); return; }
      const label = entry.querySelector('yt-formatted-string');
      if (label && label.textContent.trim() === 'Shorts') hide(entry);
    });

    document.querySelectorAll('ytm-shorts-lockup-view-model').forEach(el => {
      if (el.hasAttribute('data-fokas-hidden')) return;
      let target = el;
      let cur = el.parentElement;
      for (let i = 0; i < 12; i++) {
        if (!cur || cur === document.body) break;
        const tag = cur.tagName.toLowerCase();
        if (tag === 'ytd-rich-section-renderer' || tag === 'ytd-rich-grid-row' || tag === 'grid-shelf-view-model' || tag === 'yt-horizontal-list-renderer') {
          target = cur;
          break;
        }
        if (tag === 'ytd-rich-item-renderer') target = cur;
        cur = cur.parentElement;
      }
      hide(target);
    });

    document.querySelectorAll('ytd-video-renderer').forEach(vr => {
      if (vr.hasAttribute('data-fokas-hidden')) return;
      if (vr.querySelector('a[href^="/shorts/"]')) hide(vr);
    });

    document.querySelectorAll('ytd-reel-shelf-renderer, ytm-reel-shelf-renderer').forEach(hide);

    document.querySelectorAll('ytd-rich-section-renderer').forEach(section => {
      if (section.hasAttribute('data-fokas-hidden')) return;
      if (section.querySelector('ytd-reel-shelf-renderer, ytm-shorts-lockup-view-model')) hide(section);
    });

    document.querySelectorAll('ytd-shorts, [page-subtype="shorts"]').forEach(hide);

  } finally {
    isScanning = false;
  }
}

function scheduleScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, 300);
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes.length > 0)) scheduleScan();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

function stopObserver() {
  if (observer) { observer.disconnect(); observer = null; }
  clearTimeout(scanTimer);
}

function redirectIfShorts() {
  if (!isEnabled) return;
  if (window.location.pathname === '/shorts' || window.location.pathname.startsWith('/shorts/')) {
    window.location.replace('https://www.youtube.com/');
  }
}

(function() {
  const wrap = fn => function(...a) {
    const r = fn.apply(this, a);
    window.dispatchEvent(new Event('fokas-nav'));
    return r;
  };
  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
})();

window.addEventListener('fokas-nav', redirectIfShorts);
window.addEventListener('popstate', redirectIfShorts);
document.addEventListener('yt-navigate-finish', () => {
  redirectIfShorts();
  scheduleScan();
});

function enable() {
  isEnabled = true;
  injectCSS();
  startObserver();
  scan();
  redirectIfShorts();
}

function disable() {
  isEnabled = false;
  stopObserver();
  removeCSS();
  unhideAll();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'FOKAS_TOGGLE') return;
  msg.enabled ? enable() : disable();
});

chrome.storage.local.get(['fokasEnabled'], (result) => {
  const on = result.fokasEnabled !== undefined ? result.fokasEnabled : false;
  on ? enable() : disable();
});
