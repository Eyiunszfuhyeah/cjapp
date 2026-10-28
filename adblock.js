// adblock.js — save in cjapp\
// hosts + patterns pulled from uBlock Origin lists

export const BLOCKED_HOSTS = [
  // cinejoy specific ad networks (from the security scan)
  "llvpn.com",
  "a.wing.st",
  "lists.wing.st",
  "my.rtmark.net",
  "luugy.com",

  // general ad networks
  "doubleclick.net",
  "googlesyndication.com",
  "googletagmanager.com",
  "googletagservices.com",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "tpc.googlesyndication.com",
  "adnxs.com",
  "adsrvr.org",
  "advertising.com",
  "adobedtm.com",
  "amazon-adsystem.com",
  "media.net",
  "outbrain.com",
  "taboola.com",
  "revcontent.com",
  "sharethrough.com",
  "openx.net",
  "rubiconproject.com",
  "pubmatic.com",
  "criteo.com",
  "criteo.net",
  "moatads.com",
  "scorecardresearch.com",
  "quantserve.com",
  "adsafeprotected.com",
  "ias.net",
  "doubleverify.com",
  "chartbeat.com",
  "newrelic.com",
  "hotjar.com",
  "mixpanel.com",
  "segment.com",
  "amplitude.com",
  "fullstory.com",
  "logrocket.com",
  "clarity.ms",
  "ads.twitter.com",
  "static.ads-twitter.com",
  "connect.facebook.net",
  "tr.snapchat.com",
  "sc-static.net",
  "tiktok.com",
  "analytics.tiktok.com",

  // popup / redirect junk
  "popcash.net",
  "popads.net",
  "popadvert.com",
  "clickadu.com",
  "propellerads.com",
  "hilltopads.net",
  "adsterra.com",
  "trafficjunky.net",
  "exoclick.com",
  "juicyads.com",
  "trafficfactory.biz",
  "plugrush.com",
  "ero-advertising.com",
  "traffic-media.co",
  "go.ixl.com",
  "valueclick.com",
  "zanox.com",
  "tradedoubler.com",
  "linksynergy.com",
];

// JS to inject into the WebView — blocks ads at DOM level
export const ADBLOCKER_SCRIPT = `
(function() {
  // ── block ad scripts by src ──────────────────────────────────────────────
  const BLOCKED = ${JSON.stringify(BLOCKED_HOSTS)};

  const isBlocked = (url) => {
    if (!url) return false;
    try {
      const host = new URL(url).hostname.replace(/^www\\./, "");
      return BLOCKED.some(b => host === b || host.endsWith("." + b));
    } catch { return false; }
  };

  // override createElement to block script/iframe injection
  const _createElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    const el = _createElement(tag);
    if (tag.toLowerCase() === "script") {
      const _setSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
      Object.defineProperty(el, "src", {
        set(v) {
          if (isBlocked(v)) {
            console.log("[adblock] blocked script:", v);
            return;
          }
          _setSrc.set.call(this, v);
        },
        get() { return _setSrc.get.call(this); }
      });
    }
    if (tag.toLowerCase() === "iframe") {
      const _setSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
      Object.defineProperty(el, "src", {
        set(v) {
          // block ad iframes but allow video provider iframes
          const videoProviders = [
            "vidlink.pro","embed.su","vidsrc.cc","vidsrc.to",
            "2embed","streamtape","doodstream","filemoon"
          ];
          const isVideo = videoProviders.some(p => v && v.includes(p));
          if (!isVideo && isBlocked(v)) {
            console.log("[adblock] blocked iframe:", v);
            return;
          }
          _setSrc.set.call(this, v);
        },
        get() { return _setSrc.get.call(this); }
      });
    }
    return el;
  };

  // ── block window.open popups ──────────────────────────────────────────────
  const _open = window.open;
  window.open = function(url, ...args) {
    if (isBlocked(url)) {
      console.log("[adblock] blocked popup:", url);
      return null;
    }
    return _open.call(window, url, ...args);
  };

  // ── remove ad elements from DOM ───────────────────────────────────────────
  const AD_SELECTORS = [
    "iframe[src*='llvpn.com']",
    "iframe[src*='luugy.com']",
    "iframe[src*='adsterra']",
    "iframe[src*='popads']",
    "iframe[src*='exoclick']",
    "script[src*='llvpn.com']",
    "script[src*='a.wing.st']",
    "div[id*='ad']",
    "div[class*='ad-']",
    "div[class*='-ad']",
    "div[id*='popup']",
    "div[class*='popup']",
    "[data-zone]",
  ];

  const removeAds = () => {
    AD_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        // never remove video players
        if (el.closest("video") || el.tagName === "VIDEO") return;
        el.remove();
      });
    });
  };

  // run on load + watch for dynamic injection
  removeAds();
  const observer = new MutationObserver(removeAds);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ── block fetch/XHR to ad networks ───────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    if (isBlocked(url)) {
      console.log("[adblock] blocked fetch:", url);
      return new Response("", { status: 200 });
    }
    return _fetch(...args);
  };

  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (isBlocked(url)) {
      console.log("[adblock] blocked XHR:", url);
      this._blocked = true;
      return;
    }
    return _xhrOpen.call(this, method, url, ...rest);
  };
  const _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._blocked) return;
    return _xhrSend.call(this, ...args);
  };

  // ── kill the llvpn.com ad tag specifically ────────────────────────────────
  localStorage.setItem("addies", "false");

  console.log("[adblock] active — cinejoy clean");
})();
`;