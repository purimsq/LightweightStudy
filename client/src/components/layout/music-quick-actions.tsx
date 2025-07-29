import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { useMusic } from '@/contexts/MusicContext';

const MusicQuickActions: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    musicSource, 
    pauseTrack, 
    resumeTrack, 
    nextTrack 
  } = useMusic();

  if (!currentTrack) return null;

  // Determine colors based on music source
  const getColors = () => {
    if (musicSource === 'local') {
      return {
        bg: 'bg-[#F6BD60]/20',
        text: 'text-[#5E503F]',
        hover: 'hover:bg-[#F6BD60]/30',
        icon: 'text-[#F4A261]'
      };
    } else {
      return {
        bg: 'bg-purple-100/20',
        text: 'text-purple-300',
        hover: 'hover:bg-purple-100/30',
        icon: 'text-purple-400'
      };
    }
  };

  const colors = getColors();

  return (
    <div className={`p-3 rounded-lg ${colors.bg} mb-4`}>
      {/* Current Track Info */}
      <div className="flex items-center mb-3">
        <Music className={`w-4 h-4 mr-2 ${colors.icon}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${colors.text}`}>
            {currentTrack.name}
          </div>
          <div className={`text-xs opacity-70 truncate ${colors.text}`}>
            {currentTrack.artist}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? pauseTrack : resumeTrack}
          className={`p-2 h-8 w-8 ${colors.hover} ${colors.text}`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={nextTrack}
          className={`p-2 h-8 w-8 ${colors.hover} ${colors.text}`}
        >
          <SkipForward className="w-4 h-4" />
        </Button>

        {/* Music Source Indicator */}
        <div className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
          {musicSource === 'local' ? 'Local' : 'LuvNoir'}
        </div>
      </div>
    </div>
  );
};

export default MusicQuickActions; 