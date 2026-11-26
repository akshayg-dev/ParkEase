import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

/**
 * RootLayout wraps every page with the top nav and a main content area.
 */
export function RootLayout() {
  return (
    <div className="flex flex-col min-h-svh bg-surface-subtle">
      <Navbar />
      <main className="flex-1 py-8">
        <Outlet />
      </main>
    </div>
  )
}
