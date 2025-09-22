import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [canComplete, setCanComplete] = useState(false);

  useEffect(() => {
    // Minimum loading time of 4 seconds
    const minTimeTimer = setTimeout(() => {
      setCanComplete(true);
    }, 4000);

    // Simulate loading progress with longer duration
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100 && canComplete) {
          clearInterval(interval);
          clearTimeout(minTimeTimer);
          // Fade out animation
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Wait for fade out to complete
          }, 500);
          return 100;
        }
        return prev + Math.random() * 8 + 2; // Random increment between 2-10 (slower)
      });
    }, 150); // Slower interval (was 100ms, now 150ms)

    return () => {
      clearInterval(interval);
      clearTimeout(minTimeTimer);
    };
  }, [onComplete, canComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 flex items-center justify-center z-50 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated fade line moving across screen */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-90 animate-pulse" style={{ 
          animation: 'fadeLineMove 3s ease-in-out infinite',
          animationDelay: '0s'
        }}></div>
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80 animate-pulse" style={{ 
          animation: 'fadeLineMove 3s ease-in-out infinite',
          animationDelay: '1s'
        }}></div>
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-70 animate-pulse" style={{ 
          animation: 'fadeLineMove 3s ease-in-out infinite',
          animationDelay: '2s'
        }}></div>
      </div>

      {/* Main Content - Logo takes center stage */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {/* Massive Logo */}
        <div className="relative mb-8">
          <div className="w-96 h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl">
            <img 
              src="/images/Lightweight-logo-loading.png.jpg.jpeg" 
              alt="Lightweight Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-200 to-purple-200 opacity-10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        </div>

        {/* Minimal text below logo */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-light text-gray-700 mb-1">
            Lightweight
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-light">
            Study Companion
          </p>
        </div>
      </div>

    </div>
  );
}
