import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against external browser extension crashes (e.g., Urban VPN libs/requests.js)
if (typeof window !== 'undefined') {
  const origOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const src = String(source || '');
    const msg = String(message || '');
    const stk = String(error?.stack || '');
    if (
      src.includes('chrome-extension://') ||
      src.includes('moz-extension://') ||
      msg.includes('Cannot set property fetch') ||
      stk.includes('chrome-extension://')
    ) {
      return true; // Stop error from bubbling to uncaught error reporting
    }
    if (origOnError) {
      return (origOnError as any).apply(this, arguments);
    }
    return false;
  };

  const origConsoleError = window.console.error;
  window.console.error = function (message: any, ...args: any[]) {
    const combined = String(message) + ' ' + args.map((a) => String(a?.stack || a?.message || a)).join(' ');
    if (
      combined.includes('chrome-extension://') ||
      combined.includes('moz-extension://') ||
      combined.includes('Cannot set property fetch')
    ) {
      return; // Filter extension noise
    }
    return origConsoleError.apply(window.console, [message, ...args]);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
