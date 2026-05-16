import DOMAINS from '../utils/domainConfig'

function Legend() {
  return (
    <div className="absolute top-4 left-4 z-20 bg-gray-900/90 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm max-h-[80vh] overflow-y-auto">
      <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Domains</h3>
      <div className="space-y-2">
        {Object.entries(DOMAINS).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
            />
            <span className="text-gray-300 text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Legend
