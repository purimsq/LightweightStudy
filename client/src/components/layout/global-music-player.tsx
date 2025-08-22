import React from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const GlobalMusicPlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    volume,
    pauseTrack, 
    resumeTrack, 
    seekTo, 
    setVolume, 
    clearMusic 
  } = useMusic();

  if (!currentTrack) {
    return null;
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    seekTo(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="bg-white/95 backdrop-blur-md border-[#F6BD60]/30 shadow-lg rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Track Info */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-[#F6BD60] to-[#F4A261] rounded-xl flex items-center justify-center shadow-sm">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#5E503F] truncate">{currentTrack.name}</h3>
                <p className="text-sm text-[#5E503F]/70 truncate">{currentTrack.artist}</p>
                <p className="text-xs text-[#5E503F]/50">Press Spacebar to pause/play</p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20 rounded-full p-2 transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                onClick={isPlaying ? pauseTrack : resumeTrack}
                className="bg-gradient-to-r from-[#F6BD60]/80 to-[#F4A261]/80 hover:from-[#F4A261]/90 hover:to-[#E76F51]/90 w-12 h-12 rounded-full shadow-sm border-0 transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20 rounded-full p-2 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 mx-6">
              <div className="flex justify-between text-xs text-[#5E503F]/70 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div 
                className="w-full bg-[#F6BD60]/20 rounded-full h-2 overflow-hidden cursor-pointer"
                onClick={handleProgressClick}
              >
                <div 
                  className="bg-gradient-to-r from-[#F6BD60] to-[#F4A261] h-2 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-[#5E503F]/70" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-20 accent-[#F4A261]"
              />
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMusic}
              className="text-[#5E503F]/70 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalMusicPlayer;
