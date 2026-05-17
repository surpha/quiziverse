import { motion, AnimatePresence } from 'framer-motion';

interface HeroOverlayProps {
  isVisible: boolean;
  onEnter: () => void;
}

export function HeroOverlay({ isVisible, onEnter }: HeroOverlayProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.5,
      }
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.5 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-20 flex flex-col items-center justify-end pb-[20vh] pointer-events-none"
        >
          <div className="text-center flex flex-col items-center pointer-events-auto">
            <motion.p 
              variants={itemVariants}
              className="font-orbitron text-cyan-400 text-xs tracking-[0.4em] uppercase mb-4"
            >
              Cosmos Quiz
            </motion.p>
            
            <motion.h1 
              variants={itemVariants}
              className="text-4xl md:text-6xl text-white font-sans font-light glow-text mb-2 leading-tight"
            >
              Knowledge is not divided.
            </motion.h1>
            
            <motion.h2 
              variants={itemVariants}
              className="text-3xl md:text-5xl text-teal-400 font-sans font-light mb-8 glow-text"
              transition={{ delay: 0.6 }}
            >
              Every idea connects.
            </motion.h2>
            
            <motion.p 
              variants={itemVariants}
              className="text-gray-400 font-sans text-sm md:text-base max-w-md mx-auto mb-10 text-center"
              transition={{ delay: 1.0 }}
            >
              Explore the interconnected universe of human thought
            </motion.p>
            
            <motion.button
              variants={itemVariants}
              transition={{ delay: 1.4 }}
              onClick={onEnter}
              className="glass glow-border px-8 py-4 rounded-full font-orbitron text-cyan-400 uppercase tracking-widest text-sm hover:scale-105 transition-transform duration-300 hover:bg-cyan-900/20"
              data-testid="button-enter"
            >
              Enter the Cosmos
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
