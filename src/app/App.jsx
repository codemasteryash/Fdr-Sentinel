import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './router'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        closeButton
        gap={8}
        toastOptions={{
          style: {
            background: '#FAF8F3',
            border: '1px solid #DAD4C7',
            borderRadius: '3px',
            color: '#14201B',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontSize: '12px',
            boxShadow: '0 16px 40px -24px rgba(19, 42, 33, 0.45)',
          },
        }}
      />
    </>
  )
}
