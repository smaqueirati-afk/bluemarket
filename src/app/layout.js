import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: 'BlueMarket',
  description: 'Marketplace de pescaderías',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}