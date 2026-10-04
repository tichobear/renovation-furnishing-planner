(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    } catch (error) {
      console.error('Offline support could not be started.', error);
    }
  });

  window.addEventListener('offline', () => {
    if (typeof window.toast === 'function') window.toast('You’re offline — saved planner data is still available');
  });
  window.addEventListener('online', () => {
    if (typeof window.toast === 'function') window.toast('Back online');
  });
})();
