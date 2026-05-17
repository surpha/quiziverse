import { useState } from 'react';
import gsap from 'gsap';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { HeroOverlay } from '@/components/ui/HeroOverlay';
import { QuestionCard } from '@/components/ui/QuestionCard';
import { PlanetInfoOverlay } from '@/components/ui/PlanetInfoOverlay';
import { CursorGlow } from '@/components/ui/CursorGlow';
import { QuizFlow } from '@/components/ui/QuizFlow';
import { UniverseCanvas } from '@/components/universe/UniverseCanvas';
import { AnimatePresence } from 'framer-motion';
import { WebGLErrorBoundary } from '@/components/universe/WebGLErrorBoundary';

export default function CosmosUniverse() {
  const [loaded, setLoaded] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);

  const [activePlanet, setActivePlanet] = useState<any | null>(null);
  const [quizPlanet, setQuizPlanet] = useState<any | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{ planet: any; text: string } | null>(null);

  const [cameraZ, setCameraZ] = useState(80);

  const handleLoadComplete = () => {
    setLoaded(true);
    gsap.to({ z: 80 }, {
      z: 28,
      duration: 4.5,
      ease: 'power2.inOut',
      onUpdate: function () {
        setCameraZ(this.targets()[0].z);
      },
    });
  };

  const handleEnterCosmos = () => {
    setHeroVisible(false);
  };

  const handlePlanetClick = (planet: any) => {
    setActivePlanet(planet);
    setCurrentQuestion(null);
  };

  const handleBeaconQuestion = (planet: any, question: string) => {
    if (!activePlanet && !quizPlanet) {
      setCurrentQuestion({ planet, text: question });
    }
  };

  const handleStartQuiz = (planet: any) => {
    setActivePlanet(null);
    setCurrentQuestion(null);
    setQuizPlanet(planet);
  };

  const handleCloseQuiz = () => {
    setQuizPlanet(null);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#000008] overflow-hidden">
      {!loaded && <LoadingScreen onComplete={handleLoadComplete} />}

      <WebGLErrorBoundary>
        <UniverseCanvas
          cameraZ={cameraZ}
          onPlanetClick={handlePlanetClick}
          onBeaconQuestion={handleBeaconQuestion}
        />
      </WebGLErrorBoundary>

      <CursorGlow />

      {loaded && (
        <>
          <HeroOverlay isVisible={heroVisible} onEnter={handleEnterCosmos} />

          <AnimatePresence>
            {currentQuestion && !heroVisible && !activePlanet && !quizPlanet && (
              <QuestionCard
                key={currentQuestion.text}
                question={currentQuestion.text}
                planetName={currentQuestion.planet.name}
                planetColor={currentQuestion.planet.color}
                onDismiss={() => setCurrentQuestion(null)}
              />
            )}
          </AnimatePresence>

          <PlanetInfoOverlay
            planet={activePlanet}
            onClose={() => setActivePlanet(null)}
            onStartQuiz={handleStartQuiz}
          />

          <AnimatePresence>
            {quizPlanet && (
              <QuizFlow
                key={quizPlanet.id}
                planet={quizPlanet}
                onClose={handleCloseQuiz}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
