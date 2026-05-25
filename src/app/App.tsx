
import { RouterProvider } from 'react-router';

import { router } from './routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/*<ThemeToggle theme={theme} onToggle={toggleTheme} />*/}
    </>
  );
}

{/*import { ThemeToggle } from './components/ThemeToggle';*/}
{/*import { useEffect, useState } from 'react';*/}