import { Geist } from 'next/font/google'
import './globals.css'
import InstallPrompt from '../components/InstallPrompt'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: 'BlueMarket',
  description: 'Tu pescadería digital',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BlueMarket',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#03174a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={geist.className}>
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
