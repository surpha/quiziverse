import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Clock, Zap } from 'lucide-react';
import { QUIZ_QUESTIONS, type QuizQuestion } from '@/data/quizQuestions';

const SECONDS_PER_QUESTION = 30;
const QUESTIONS_PER_QUIZ = 6;

interface QuizFlowProps {
  planet: any;
  onClose: () => void;
}

type Phase = 'quiz' | 'summary';

interface AnswerRecord {
  question: QuizQuestion;
  chosen: number | null;
  correct: boolean;
  timeLeft: number;
}

function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);
  return (
    <svg width={56} height={56} className="rotate-[-90deg]">
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle
        cx={28} cy={28} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s linear', filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

function QuizScreen({ planet, questions, onFinish }: {
  planet: any;
  questions: QuizQuestion[];
  onFinish: (records: AnswerRecord[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  const current = questions[index];

  const advance = useCallback((chosenIndex: number | null, remainingTime: number) => {
    const isCorrect = chosenIndex === current.correctIndex;
    const newRecords = [...records, { question: current, chosen: chosenIndex, correct: isCorrect, timeLeft: remainingTime }];
    setRecords(newRecords);
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(i => i + 1);
        setChosen(null);
        setRevealed(false);
        setTimeLeft(SECONDS_PER_QUESTION);
      } else {
        onFinish(newRecords);
      }
    }, revealed ? 1200 : 600);
  }, [current, index, questions.length, records, onFinish, revealed]);

  const handleChoose = (optIndex: number) => {
    if (revealed) return;
    setChosen(optIndex);
    setRevealed(true);
    advance(optIndex, timeLeft);
  };

  useEffect(() => {
    if (revealed) return;
    if (timeLeft <= 0) {
      setRevealed(true);
      advance(null, 0);
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, revealed, advance]);

  const timerProgress = timeLeft / SECONDS_PER_QUESTION;
  const timerColor = timerProgress > 0.5 ? planet.color : timerProgress > 0.25 ? '#ffcc00' : '#ff4422';

  const getOptionStyle = (i: number) => {
    if (!revealed) {
      return 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 cursor-pointer';
    }
    if (i === current.correctIndex) {
      return 'border-green-400/80 bg-green-400/15 text-green-300';
    }
    if (i === chosen && i !== current.correctIndex) {
      return 'border-red-400/80 bg-red-400/15 text-red-300';
    }
    return 'border-white/5 bg-white/3 opacity-40';
  };

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-orbitron tracking-widest uppercase opacity-60">Question</span>
          <span className="font-orbitron text-white font-bold">{index + 1}</span>
          <span className="text-white/30">/</span>
          <span className="font-orbitron text-white/50">{questions.length}</span>
        </div>
        {/* Timer */}
        <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
          <ProgressRing progress={timerProgress} color={timerColor} />
          <span
            className="absolute font-orbitron text-sm font-bold"
            style={{ color: timerColor, transition: 'color 0.5s' }}
          >
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: planet.color, boxShadow: `0 0 8px ${planet.color}` }}
          animate={{ width: `${((index) / questions.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Question */}
      <div className="min-h-[80px]">
        <p className="text-white text-lg leading-relaxed font-light" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {current.question}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {current.options.map((opt, i) => (
          <motion.button
            key={i}
            data-testid={`option-${i}`}
            onClick={() => handleChoose(i)}
            className={`w-full text-left px-5 py-4 rounded-lg border text-sm leading-snug transition-all duration-200 ${getOptionStyle(i)}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            whileHover={!revealed ? { scale: 1.01 } : {}}
            whileTap={!revealed ? { scale: 0.99 } : {}}
          >
            <span className="font-orbitron text-xs mr-3 opacity-50">{String.fromCharCode(65 + i)}</span>
            {opt}
          </motion.button>
        ))}
      </div>

      {/* Explanation after reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-lg px-5 py-4 text-sm leading-relaxed"
              style={{
                background: `${chosen === current.correctIndex ? 'rgba(0,220,100,0.08)' : 'rgba(255,100,80,0.08)'}`,
                border: `1px solid ${chosen === current.correctIndex ? 'rgba(0,220,100,0.25)' : 'rgba(255,100,80,0.25)'}`,
                color: 'rgba(255,255,255,0.75)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {chosen === null ? (
                <span className="text-yellow-400 font-medium">Time's up. </span>
              ) : chosen === current.correctIndex ? (
                <span className="text-green-400 font-medium">Correct. </span>
              ) : (
                <span className="text-red-400 font-medium">Incorrect. </span>
              )}
              {current.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SummaryScreen({ planet, records, onClose, onRetry }: {
  planet: any;
  records: AnswerRecord[];
  onClose: () => void;
  onRetry: () => void;
}) {
  const correct = records.filter(r => r.correct).length;
  const total = records.length;
  const pct = Math.round((correct / total) * 100);
  const avgTime = Math.round(records.reduce((s, r) => s + (SECONDS_PER_QUESTION - r.timeLeft), 0) / total);

  const grade = pct >= 90 ? 'STELLAR' : pct >= 70 ? 'STRONG' : pct >= 50 ? 'BUILDING' : 'NOVICE';
  const gradeColor = pct >= 90 ? planet.color : pct >= 70 ? '#88ffaa' : pct >= 50 ? '#ffcc44' : '#ff7755';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* Score ring */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative" style={{ width: 120, height: 120 }}>
          <svg width={120} height={120} className="rotate-[-90deg]">
            <circle cx={60} cy={60} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <motion.circle
              cx={60} cy={60} r={52} fill="none"
              stroke={gradeColor} strokeWidth={6}
              strokeDasharray={2 * Math.PI * 52}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${gradeColor})` }}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct / 100) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-orbitron text-3xl font-bold" style={{ color: gradeColor }}>{pct}</span>
            <span className="font-orbitron text-xs opacity-50">%</span>
          </div>
        </div>
        <div>
          <div className="font-orbitron text-center font-bold text-lg tracking-widest" style={{ color: gradeColor }}>
            {grade}
          </div>
          <div className="text-center text-sm opacity-50" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {correct} of {total} correct
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Correct', value: String(correct), color: '#44ff88' },
          { label: 'Avg Time', value: `${avgTime}s`, color: planet.color },
          { label: 'Score', value: `${pct}%`, color: gradeColor },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="font-orbitron text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs opacity-40 font-orbitron tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Question review */}
      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {records.map((r, i) => (
          <div
            key={r.question.id}
            className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
            style={{
              background: r.correct ? 'rgba(0,200,100,0.06)' : 'rgba(255,80,60,0.06)',
              border: `1px solid ${r.correct ? 'rgba(0,200,100,0.15)' : 'rgba(255,80,60,0.15)'}`,
            }}
          >
            <span className="font-orbitron text-xs opacity-40 mt-0.5 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 leading-snug line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {r.question.question}
              </p>
              {!r.correct && (
                <p className="text-green-400/70 text-xs mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {r.question.options[r.question.correctIndex]}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {r.correct
                ? <span className="text-green-400 text-base">✓</span>
                : <span className="text-red-400 text-base">✗</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <motion.button
          onClick={onRetry}
          className="flex-1 py-3 rounded-lg font-orbitron text-xs tracking-widest uppercase border transition-colors"
          style={{ borderColor: `${planet.color}55`, color: planet.color, background: `${planet.color}10` }}
          whileHover={{ scale: 1.02, background: `${planet.color}20` } as any}
          whileTap={{ scale: 0.98 }}
          data-testid="button-retry-quiz"
        >
          Try Again
        </motion.button>
        <motion.button
          onClick={onClose}
          className="flex-1 py-3 rounded-lg font-orbitron text-xs tracking-widest uppercase bg-white/8 border border-white/10 text-white/70 transition-colors"
          whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.12)' } as any}
          whileTap={{ scale: 0.98 }}
          data-testid="button-close-quiz-summary"
        >
          Explore
        </motion.button>
      </div>
    </motion.div>
  );
}

export function QuizFlow({ planet, onClose }: QuizFlowProps) {
  const allQuestions = QUIZ_QUESTIONS[planet.id] ?? [];
  const [questions] = useState<QuizQuestion[]>(() => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(QUESTIONS_PER_QUIZ, shuffled.length));
  });
  const [phase, setPhase] = useState<Phase>('quiz');
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  const handleFinish = (r: AnswerRecord[]) => {
    setRecords(r);
    setPhase('summary');
  };

  const handleRetry = () => {
    setPhase('quiz');
    setRecords([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,8,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg glass rounded-2xl p-7 overflow-hidden"
        style={{ borderColor: `${planet.color}25`, boxShadow: `0 0 60px ${planet.color}18, 0 0 120px ${planet.color}08` }}
      >
        {/* Ambient glow top */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${planet.color}, transparent)`, opacity: 0.6 }}
        />

        {/* Planet label header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${planet.secondaryColor}, ${planet.color})`,
                boxShadow: `0 0 12px ${planet.color}80`,
              }}
            />
            <div>
              <span className="font-orbitron text-xs tracking-widest uppercase opacity-40">Quiz</span>
              <span className="font-orbitron text-xs tracking-widest uppercase opacity-40 mx-2">/</span>
              <span className="font-orbitron text-sm font-bold" style={{ color: planet.color }}>{planet.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1"
            data-testid="button-close-quiz"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {phase === 'quiz' && questions.length > 0 ? (
            <QuizScreen
              key="quiz"
              planet={planet}
              questions={questions}
              onFinish={handleFinish}
            />
          ) : phase === 'summary' ? (
            <SummaryScreen
              key="summary"
              planet={planet}
              records={records}
              onClose={onClose}
              onRetry={handleRetry}
            />
          ) : (
            <div key="empty" className="text-center text-white/40 py-12 font-orbitron text-sm">
              No questions available for this domain yet.
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
