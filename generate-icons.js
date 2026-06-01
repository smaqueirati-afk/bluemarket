const { createCanvas } = require('canvas')
const fs = require('fs')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Fondo azul
  ctx.fillStyle = '#03174a'
  ctx.fillRect(0, 0, size, size)

  // Círculo azul claro
  ctx.fillStyle = '#4db8ff'
  ctx.beginPath()
  ctx.arc(size/2, size/2, size*0.35, 0, Math.PI * 2)
  ctx.fill()

  // Letra B
  ctx.fillStyle = '#03174a'
  ctx.font = `bold ${size*0.4}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('B', size/2, size/2)

  return canvas.toBuffer('image/png')
}

fs.writeFileSync('public/icons/icon-192x192.png', generateIcon(192))
fs.writeFileSync('public/icons/icon-512x512.png', generateIcon(512))
console.log('Íconos generados correctamente')