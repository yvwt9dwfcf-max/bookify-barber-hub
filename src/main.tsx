import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/silence-toasts";
import { installStorageImageFallback } from "./lib/storageImages";

installStorageImageFallback();

// Load the shared typefaces without a remote CSS import.
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Luckiest+Guy&display=swap';
document.head.appendChild(fontLink);

// Apply saved theme
const savedTheme = localStorage.getItem('bookify-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
}

// Prevent pinch-to-zoom (native app behavior)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
