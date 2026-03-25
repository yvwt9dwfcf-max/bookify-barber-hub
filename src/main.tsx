import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme
const savedTheme = localStorage.getItem('bookify-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
}

// Prevent pinch-to-zoom (native app behavior)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

createRoot(document.getElementById("root")!).render(<App />);
