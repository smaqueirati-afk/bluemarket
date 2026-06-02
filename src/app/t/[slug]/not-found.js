export default function NoEncontrada() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)] px-8 text-center">
      <div>
        <div className="text-5xl mb-4 opacity-50">🐟</div>
        <h1 className="text-xl font-extrabold text-white mb-2">Pescadería no encontrada</h1>
        <p className="text-white/55 text-sm leading-relaxed">
          El link que usaste no corresponde a ninguna pescadería activa.<br />
          Verificá el enlace o pedíselo de nuevo a tu pescadería.
        </p>
      </div>
    </div>
  )
}
