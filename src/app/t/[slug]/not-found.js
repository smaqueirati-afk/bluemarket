export default function NoEncontrada() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)] px-8 text-center">
      <div>
        <img
          src="/icons/icon-192.png"
          alt="BlueMarket"
          className="w-24 h-24 rounded-2xl mx-auto mb-5 shadow-lg"
        />
        <h1 className="text-xl font-extrabold text-white mb-2">Tienda no encontrada</h1>
        <p className="text-white/55 text-sm leading-relaxed">
          El link que usaste no corresponde a ninguna tienda activa.<br />
          Verificá el enlace o pedíselo de nuevo a la tienda.
        </p>
      </div>
    </div>
  )
}
