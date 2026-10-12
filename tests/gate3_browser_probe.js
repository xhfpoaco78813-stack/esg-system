window.gate3BrowserErrors = [];
window.gate3BrowserWarnings = [];
window.addEventListener('error', event => window.gate3BrowserErrors.push(String(event.error?.stack || event.message)));
window.addEventListener('unhandledrejection', event => window.gate3BrowserErrors.push(String(event.reason?.stack || event.reason)));
const gate3Warn416 = console.warn.bind(console);
const gate3Error416 = console.error.bind(console);
console.warn = (...values) => { window.gate3BrowserWarnings.push(values.map(String).join(' ')); gate3Warn416(...values); };
console.error = (...values) => { window.gate3BrowserErrors.push(values.map(String).join(' ')); gate3Error416(...values); };
