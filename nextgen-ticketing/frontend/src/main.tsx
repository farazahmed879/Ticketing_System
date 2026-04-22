import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize Theme
const savedTheme = localStorage.getItem('theme') || 'dark';
const savedPrimary = localStorage.getItem('--accent-primary') || '#7c3aed';
const savedSecondary = localStorage.getItem('--accent-secondary') || '#06b6d4';

document.documentElement.setAttribute('data-theme', savedTheme);
document.documentElement.style.setProperty('--accent-primary', savedPrimary);
document.documentElement.style.setProperty('--accent-secondary', savedSecondary);
document.documentElement.style.setProperty('--border-active', `${savedPrimary}80`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
