import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 bg-[#050810] z-50 flex flex-col items-center justify-center"
        >
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-t-2 border-cyan-500/50 rounded-full animate-spin [animation-duration:3s]" />
            <div className="absolute inset-2 border-r-2 border-blue-500/40 rounded-full animate-spin [animation-duration:2s] [animation-direction:reverse]" />
            <div className="absolute inset-4 border-b-2 border-purple-500/30 rounded-full animate-spin [animation-duration:4s]" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-orbitron text-cyan-400 tracking-[0.3em] glow-text mb-4 text-center">
            COSMOS QUIZ
          </h1>
          
          <div className="flex gap-1 mb-6">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          
          <p className="text-cyan-600/70 font-sans tracking-widest text-sm uppercase">
            Calibrating the universe...
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
