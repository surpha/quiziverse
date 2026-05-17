import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PlanetInfoOverlayProps {
  planet: any | null;
  onClose: () => void;
  onStartQuiz: (planet: any) => void;
}

const DESCRIPTIONS: Record<string, string> = {
  science: "From quantum mechanics to cosmology, test your grasp of the universe's fundamental laws. Explore the elegant mathematics behind physical reality.",
  politics: "Navigate the complex interplay of power, governance, and ideology. Challenge your understanding of political systems across history and borders.",
  environment: "Grapple with Earth's most urgent questions. From ecology to climate science, explore the delicate systems that sustain all life.",
  technology: "Probe the frontiers of human invention. From computing theory to emerging tech, test your knowledge of civilization's most powerful tools.",
  philosophy: "Question the foundations of reality, knowledge, ethics, and existence. Great thinkers across millennia await your consideration.",
  history: "Every present moment is a product of the past. Explore the events, figures, and forces that shaped the world we inhabit.",
  literature: "Language is how humanity dreams. Explore the stories, authors, and ideas that have defined cultures and changed minds.",
  economics: "Understand the invisible forces that shape human behavior and global systems. From micro to macro, explore the science of choice.",
  society: "Examine the structures, norms, and dynamics that bind human communities together — and sometimes tear them apart."
};

export function PlanetInfoOverlay({ planet, onClose, onStartQuiz }: PlanetInfoOverlayProps) {
  return (
    <AnimatePresence>
      {planet && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[400px] z-40 glass border-l border-white/10 p-8 flex flex-col"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            data-testid="button-close-planet-info"
          >
            <X size={24} />
          </button>
          
          <div className="mt-8 flex-1">
            <div 
              className="w-12 h-12 rounded-full mb-6"
              style={{ 
                background: `radial-gradient(circle at 30% 30%, ${planet.secondaryColor}, ${planet.color})`,
                boxShadow: `0 0 20px ${planet.color}60`
              }}
            />
            
            <h2 className="text-4xl font-orbitron text-white glow-text mb-6">
              {planet.name}
            </h2>
            
            <p className="text-gray-300 font-sans leading-relaxed mb-10">
              {DESCRIPTIONS[planet.id] || "Explore this domain of knowledge."}
            </p>
            
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div>
                <p className="text-gray-500 text-xs uppercase font-orbitron tracking-wider mb-1">Questions</p>
                <p className="text-white font-sans text-xl">{planet.stats.questions}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-orbitron tracking-wider mb-1">Active</p>
                <p className="text-white font-sans text-xl">{planet.stats.players}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase font-orbitron tracking-wider mb-1">Difficulty</p>
                <p className="text-white font-sans text-xl">{planet.stats.difficulty}</p>
              </div>
            </div>
            
            <button
              onClick={() => onStartQuiz(planet)}
              data-testid="button-start-quiz"
              className="w-full py-4 rounded-lg font-orbitron tracking-widest uppercase text-sm transition-colors"
              style={{
                background: `${planet.color}18`,
                border: `1px solid ${planet.color}55`,
                color: planet.color,
                boxShadow: `0 0 20px ${planet.color}20`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${planet.color}30`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${planet.color}18`; }}
            >
              Start Quiz
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
