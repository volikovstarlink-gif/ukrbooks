/* UkrBooks anti-adblock canary. Path "/ads.js" is commonly blocked by
   EasyList. If this file loads, window.abc is set; if blocked, the layout
   checker reports to /api/track/ad-event so we can measure adblock usage.
   Never gates downloads. */
(function () {
  try {
    window.abc = false;
    window.__ukrAdCanary = { ok: true, ts: Date.now() };
  } catch (e) {}
})();
