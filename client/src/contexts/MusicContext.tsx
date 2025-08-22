import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

export type MusicSource = 'luvnoir' | 'local' | null;

export interface GlobalTrack {
  id: string;
  name: string;
  artist: string;
  duration: string;
  url: string;
  source: MusicSource;
  thumbnail?: string;
}

interface MusicContextType {
  // Current track and playback
  currentTrack: GlobalTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  
  // Music source tracking
  musicSource: MusicSource;
  previousPage: string;
  
  // Playback controls
  playTrack: (track: GlobalTrack, source: MusicSource) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  nextTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  
  // Navigation tracking
  setPreviousPage: (page: string) => void;
  clearMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<GlobalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [musicSource, setMusicSource] = useState<MusicSource>(null);
  const [previousPage, setPreviousPageState] = useState('/progress');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume / 100;
    }

    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Auto-play next track if available
      nextTrack();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Global keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle spacebar for play/pause
      if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scrolling
        
        if (currentTrack) {
          if (isPlaying) {
            pauseTrack();
          } else {
            resumeTrack();
          }
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentTrack, isPlaying]);

  const playTrack = (track: GlobalTrack, source: MusicSource) => {
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
      setCurrentTrack(track);
      setMusicSource(source);
      setIsPlaying(true);
      audioRef.current.play();
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    // This will be implemented based on the current music source
    // For now, just stop the current track
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
  };

  const setPreviousPage = (page: string) => {
    setPreviousPageState(page);
  };

  const clearMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setMusicSource(null);
  };

  const value: MusicContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    musicSource,
    previousPage,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    seekTo,
    setVolume,
    setPreviousPage,
    clearMusic,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}; 