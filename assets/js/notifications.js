(() => {
  let ready;
  function loadOneSignal() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('SDK timeout')), 20000);
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async OneSignal => {
        try {
          const base = new URL('.', document.baseURI);
          const worker = new URL('push/onesignal/OneSignalSDKWorker.js', base);
          await OneSignal.init({
            appId: SITE_CONFIG.oneSignalAppId,
            serviceWorkerPath: worker.pathname.replace(/^\/+/, ''),
            serviceWorkerParam: {scope: new URL('./',worker).pathname},
            notifyButton: {enable:false},
            promptOptions: {slidedown:{prompts:[{type:'push',autoPrompt:false}]}}
          });
          OneSignal.User.PushSubscription.addEventListener('change', event => {
            if (event.current.optedIn) showMessage('subscribed');
          });
          clearTimeout(timeout); resolve(OneSignal);
        } catch(error) {clearTimeout(timeout); reject(error);}
      });
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      script.onerror = () => {clearTimeout(timeout); reject(new Error('SDK unavailable'));};
      document.head.append(script);
    });
    return ready;
  }
  document.querySelectorAll('[data-notify]').forEach(button => button.addEventListener('click', async () => {
    if (!SITE_CONFIG.oneSignalAppId) return showMessage('unconfigured');
    if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator)) return showMessage('unsupported');
    if (Notification.permission === 'denied') return showMessage('blocked');
    button.disabled = true; showMessage('loading');
    try {
      const sdk = await loadOneSignal();
      if (!sdk.Notifications.isPushSupported()) return showMessage('unsupported');
      if (sdk.User.PushSubscription.optedIn) return showMessage('subscribed');
      showMessage('pending');
      // This soft prompt supplies a fresh deliberate gesture for the browser permission dialog.
      await sdk.Slidedown.promptPush({force:true});
    } catch (_) {showMessage('pushError');}
    finally {button.disabled = false;}
  }));
})();
