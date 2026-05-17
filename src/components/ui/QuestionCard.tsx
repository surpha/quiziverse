import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface QuestionCardProps {
  question: string;
  planetName: string;
  planetColor: string;
  onDismiss: () => void;
}

export function QuestionCard({ question, planetName, planetColor, onDismiss }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-2xl glass p-6 rounded-2xl glow-border"
      style={{ boxShadow: `0 0 15px ${planetColor}40, inset 0 0 15px ${planetColor}10` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: planetColor, boxShadow: `0 0 8px ${planetColor}` }} 
        />
        <span className="font-orbitron text-xs tracking-widest text-gray-400 uppercase">
          {planetName} TRANSMISSION
        </span>
      </div>
      
      <h3 className="text-xl md:text-2xl font-sans text-white italic font-light mb-6">
        "{question}"
      </h3>
      
      <div className="flex justify-between items-center">
        <button className="text-cyan-400 font-sans text-sm hover:text-cyan-300 transition-colors flex items-center gap-1 group">
          Explore this topic <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>
        <button 
          onClick={onDismiss}
          className="text-gray-500 hover:text-white transition-colors p-2"
          data-testid="button-dismiss-question"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
