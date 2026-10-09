window.gate2BrowserErrors = [];
window.addEventListener('error', event => window.gate2BrowserErrors.push(String(event.error?.stack || event.message)));
window.addEventListener('unhandledrejection', event => window.gate2BrowserErrors.push(String(event.reason?.stack || event.reason)));
