import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { ThemeToggle } from './components/ThemeToggle';
import { router } from './routes';

function getInitialTheme(): 'light' | 'dark' {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <RouterProvider router={router} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
    </>
  );
}
