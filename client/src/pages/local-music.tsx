import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Upload, 
  Music, 
  Clock, 
  User, 
  Menu, 
  ArrowLeft,
  FileAudio,
  X,
  Filter,
  Shuffle,
  Repeat,
  List,
  CheckSquare,
  Square,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface LocalTrack {
  id: string;
  name: string;
  artist: string;
  duration: string;
  file: File;
  url: string;
  uploadedAt: Date;
}

const LocalMusic: React.FC = () => {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<LocalTrack | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'favorites'>('all');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [playedTracks, setPlayedTracks] = useState<string[]>([]);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', trackId?: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tracks from localStorage on mount
  useEffect(() => {
    const savedTracks = localStorage.getItem('localMusicTracks');
    if (savedTracks) {
      const parsedTracks = JSON.parse(savedTracks);
      setTracks(parsedTracks.map((track: any) => ({
        ...track,
        uploadedAt: new Date(track.uploadedAt)
      })));
    }
  }, []);

  // Save tracks to localStorage whenever tracks change
  useEffect(() => {
    localStorage.setItem('localMusicTracks', JSON.stringify(tracks));
  }, [tracks]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      handleTrackEnd();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, shuffleMode, repeatMode, tracks]);

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      // Repeat current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      // Play next track
      playNextTrack();
    }
  };

  const playNextTrack = () => {
    if (tracks.length === 0) return;
    
    let nextIndex: number;
    
    if (shuffleMode) {
      // Get unplayed tracks
      const unplayedTracks = tracks.filter((_, index) => !playedTracks.includes(tracks[index].id));
      
      if (unplayedTracks.length === 0) {
        // All tracks have been played, reset and start fresh
        setPlayedTracks([]);
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        nextIndex = tracks.findIndex(t => t.id === randomTrack.id);
      } else {
        // Play a random unplayed track
        const randomTrack = unplayedTracks[Math.floor(Math.random() * unplayedTracks.length)];
        nextIndex = tracks.findIndex(t => t.id === randomTrack.id);
      }
    } else {
      // Play next track in order
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= tracks.length) {
        if (repeatMode === 'all') {
          nextIndex = 0; // Loop back to first track
        } else {
          // Stop playing
          setIsPlaying(false);
          setCurrentTime(0);
          return;
        }
      }
    }
    
    playTrackByIndex(nextIndex);
  };

  const playPreviousTrack = () => {
    if (tracks.length === 0) return;
    
    let prevIndex: number;
    
    if (shuffleMode) {
      // Get unplayed tracks
      const unplayedTracks = tracks.filter((_, index) => !playedTracks.includes(tracks[index].id));
      
      if (unplayedTracks.length === 0) {
        // All tracks have been played, reset and start fresh
        setPlayedTracks([]);
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        prevIndex = tracks.findIndex(t => t.id === randomTrack.id);
      } else {
        // Play a random unplayed track
        const randomTrack = unplayedTracks[Math.floor(Math.random() * unplayedTracks.length)];
        prevIndex = tracks.findIndex(t => t.id === randomTrack.id);
      }
    } else {
      // Play previous track in order
      prevIndex = currentTrackIndex - 1;
      if (prevIndex < 0) {
        if (repeatMode === 'all') {
          prevIndex = tracks.length - 1; // Loop to last track
        } else {
          prevIndex = 0; // Stay at first track
        }
      }
    }
    
    playTrackByIndex(prevIndex);
  };

  const playTrackByIndex = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      const track = tracks[index];
      playTrack(track);
      setCurrentTrackIndex(index);
      
      // Add to played tracks if shuffle is on
      if (shuffleMode && !playedTracks.includes(track.id)) {
        setPlayedTracks(prev => [...prev, track.id]);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newTracks: LocalTrack[] = Array.from(files)
      .filter((file): file is File => file.type.startsWith('audio/'))
      .map(file => {
        const url = URL.createObjectURL(file);
        const track: LocalTrack = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          artist: 'Unknown Artist',
          duration: '0:00', // Will be updated when audio loads
          file,
          url,
          uploadedAt: new Date()
        };
        return track;
      });

    setTracks(prev => [...prev, ...newTracks]);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const playTrack = (track: LocalTrack) => {
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
      setCurrentTrack(track);
      setCurrentTrackIndex(tracks.findIndex(t => t.id === track.id));
      setIsPlaying(true);
      audioRef.current.play();
      
      // Add to played tracks if shuffle is on
      if (shuffleMode && !playedTracks.includes(track.id)) {
        setPlayedTracks(prev => [...prev, track.id]);
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const setPlayerVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDeleteTrack = (trackId: string) => {
    setDeleteTarget({ type: 'single', trackId });
    setShowDeleteDialog(true);
  };

  const handleBulkDelete = () => {
    setDeleteTarget({ type: 'bulk' });
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'single' && deleteTarget.trackId) {
      removeTrack(deleteTarget.trackId);
    } else if (deleteTarget.type === 'bulk') {
      selectedTracks.forEach(removeTrack);
      setSelectedTracks([]);
      setSelectAll(false);
      setShowMultiSelect(false);
    }

    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  const removeTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      URL.revokeObjectURL(track.url);
    }
    setTracks(prev => prev.filter(t => t.id !== trackId));
    
    if (currentTrack?.id === trackId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setCurrentTrack(null);
      setCurrentTrackIndex(-1);
      setIsPlaying(false);
    }
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedTracks((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTracks([]);
      setSelectAll(false);
    } else {
      setSelectedTracks(filteredTracks.map((t) => t.id));
      setSelectAll(true);
    }
  };

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return matchesSearch && track.uploadedAt > oneWeekAgo;
    }
    
    return matchesSearch;
  });

  const goBack = () => {
    window.location.href = '/music';
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5E503F]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#F6BD60]/30 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-[#5E503F] hover:text-[#4A3C2F] hover:bg-[#F6BD60]/20 rounded-full p-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#5E503F] hover:text-[#4A3C2F] hover:bg-[#F6BD60]/20 rounded-full p-2 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#F6BD60] to-[#F4A261] rounded-xl flex items-center justify-center shadow-sm">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-[#5E503F] to-[#4A3C2F] bg-clip-text text-transparent">
                  LuvNoir
                </span>
                <p className="text-xs text-[#5E503F]/70 -mt-1">Local Music</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search your local music library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/90 border-[#F6BD60]/30 text-[#5E503F] placeholder:text-[#5E503F]/50 focus:border-[#F4A261] focus:ring-2 focus:ring-[#F6BD60]/20 rounded-xl pl-4 pr-12 py-3 transition-colors"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#5E503F]/50" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBrowseModal(true)}
              className="text-[#5E503F] hover:text-[#4A3C2F] hover:bg-[#F6BD60]/20 rounded-full p-2 transition-colors"
            >
              <List className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-[#5E503F] hover:text-[#4A3C2F] hover:bg-[#F6BD60]/20 rounded-full p-2 transition-colors">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`bg-[#FFF5EC] backdrop-blur-md border-r border-[#F6BD60]/30 transition-all duration-300 h-screen shadow-sm ${
          sidebarOpen ? 'w-72' : 'w-20'
        }`}>
          <nav className="p-6 space-y-6">
            {/* Welcome Section */}
            {sidebarOpen && (
              <div className="mb-8">
                <div className="bg-white/80 rounded-2xl p-4 border border-[#F6BD60]/20">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#F6BD60] to-[#F4A261] rounded-lg flex items-center justify-center">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#5E503F]">Welcome!</h3>
                      <p className="text-xs text-[#5E503F]/70">Your personal music library</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#5E503F]/80 leading-relaxed">
                    Upload your favorite music files and enjoy them with the beautiful LuvNoir interface.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-[#5E503F] hover:text-[#4A3C2F] hover:bg-[#F6BD60]/20 h-12 rounded-xl transition-colors"
              >
                <Music className="w-5 h-5 mr-3" />
                {sidebarOpen && 'Local Music'}
              </Button>
              
              {/* Upload Button */}
              <Button 
                variant="default" 
                className="w-full justify-start bg-gradient-to-r from-[#F6BD60]/80 to-[#F4A261]/80 hover:from-[#F4A261]/90 hover:to-[#E76F51]/90 text-white border-0 h-12 rounded-xl shadow-sm transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 mr-3" />
                {sidebarOpen && 'Upload Music'}
              </Button>
            </div>
            
            {/* Filter Buttons */}
            <div className="space-y-2">
              <h4 className={`text-xs font-semibold text-[#5E503F]/70 uppercase tracking-wider ${!sidebarOpen && 'hidden'}`}>
                Library
              </h4>
              <Button 
                variant={filterType === 'all' ? 'default' : 'ghost'} 
                className={`w-full justify-start text-[#5E503F] hover:text-[#4A3C2F] h-10 rounded-lg transition-colors ${filterType === 'all' ? 'bg-[#F6BD60]/20 border-[#F4A261] text-[#5E503F]' : ''}`}
                onClick={() => setFilterType('all')}
              >
                <Filter className="w-4 h-4 mr-3" />
                {sidebarOpen && 'All Tracks'}
              </Button>
              <Button 
                variant={filterType === 'recent' ? 'default' : 'ghost'} 
                className={`w-full justify-start text-[#5E503F] hover:text-[#4A3C2F] h-10 rounded-lg transition-colors ${filterType === 'recent' ? 'bg-[#F6BD60]/20 border-[#F4A261] text-[#5E503F]' : ''}`}
                onClick={() => setFilterType('recent')}
              >
                <Clock className="w-4 h-4 mr-3" />
                {sidebarOpen && 'Recent'}
              </Button>
            </div>
          </nav>

          {sidebarOpen && (
            <div className="p-6 border-t border-[#F6BD60]/30 mt-8">
              <h3 className="text-sm font-semibold text-[#5E503F] mb-4 flex items-center">
                <div className="w-2 h-2 bg-[#F4A261] rounded-full mr-2"></div>
                Library Stats
              </h3>
              <div className="space-y-3">
                <div className="bg-white/60 rounded-lg p-3 border border-[#F6BD60]/20">
                  <div className="text-2xl font-bold text-[#5E503F]">{tracks.length}</div>
                  <div className="text-xs text-[#5E503F]/70">Total Tracks</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-[#F4A261]/20">
                  <div className="text-lg font-semibold text-[#5E503F]">{formatTime(tracks.reduce((acc, track) => acc + (parseFloat(track.duration) || 0), 0))}</div>
                  <div className="text-xs text-[#5E503F]/70">Total Duration</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Currently Playing */}
            <div className="lg:col-span-2">
              <Card className="bg-white/95 backdrop-blur-md border-[#F6BD60]/30 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                  {currentTrack ? (
                    <div className="space-y-8">
                      {/* Album Art Placeholder */}
                      <div className="flex items-start space-x-6">
                        <div className="w-40 h-40 bg-gradient-to-br from-[#F6BD60] via-[#F4A261] to-[#E76F51] rounded-2xl flex items-center justify-center shadow-sm border border-[#F6BD60]/30">
                          <Music className="w-16 h-16 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-4">
                            <h1 className="text-3xl font-bold text-[#5E503F] mb-2 leading-tight">{currentTrack.name}</h1>
                            <p className="text-lg text-[#5E503F]/80 font-medium">{currentTrack.artist}</p>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm text-[#5E503F]/70 font-medium">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                            <div 
                              className="w-full bg-[#F6BD60]/20 rounded-full h-3 overflow-hidden cursor-pointer"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = clickX / rect.width;
                                const newTime = percentage * duration;
                                seekTo(newTime);
                              }}
                            >
                              <div 
                                className="bg-gradient-to-r from-[#F6BD60] to-[#F4A261] h-3 rounded-full transition-all duration-300 shadow-sm relative"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Playback Controls */}
                      <div className="flex items-center justify-center space-x-6">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const newShuffleMode = !shuffleMode;
                            setShuffleMode(newShuffleMode);
                            if (!newShuffleMode) {
                              // Reset played tracks when shuffle is turned off
                              setPlayedTracks([]);
                            }
                          }}
                          className={`rounded-full p-3 transition-colors ${
                            shuffleMode 
                              ? 'text-[#F4A261] bg-[#F6BD60]/20' 
                              : 'text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20'
                          }`}
                        >
                          <Shuffle className="w-6 h-6" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={playPreviousTrack}
                          className="text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20 rounded-full p-3 transition-colors"
                        >
                          <SkipBack className="w-6 h-6" />
                        </Button>
                        <Button
                          onClick={togglePlayPause}
                          className="bg-gradient-to-r from-[#F6BD60]/80 to-[#F4A261]/80 hover:from-[#F4A261]/90 hover:to-[#E76F51]/90 w-16 h-16 rounded-full shadow-sm border-0 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={playNextTrack}
                          className="text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20 rounded-full p-3 transition-colors"
                        >
                          <SkipForward className="w-6 h-6" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (repeatMode === 'none') setRepeatMode('all');
                            else if (repeatMode === 'all') setRepeatMode('one');
                            else setRepeatMode('none');
                          }}
                          className={`rounded-full p-3 transition-colors relative ${
                            repeatMode !== 'none'
                              ? 'text-[#F4A261] bg-[#F6BD60]/20' 
                              : 'text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20'
                          }`}
                        >
                          <Repeat className="w-6 h-6" />
                          {repeatMode === 'one' && (
                            <span className="absolute -top-1 -right-1 bg-[#F4A261] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              1
                            </span>
                          )}
                        </Button>
                      </div>

                      {/* Volume Control */}
                      <div className="flex items-center justify-center space-x-4">
                        <Volume2 className="w-5 h-5 text-[#5E503F]/70" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setPlayerVolume(parseInt(e.target.value))}
                          className="w-40 accent-[#F4A261]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#F6BD60]/20 to-[#F4A261]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Music className="w-12 h-12 text-[#F4A261]" />
                      </div>
                      <h2 className="text-3xl font-bold text-[#5E503F] mb-3">No Track Playing</h2>
                      <p className="text-[#5E503F]/80 text-lg mb-6">Select a track from your library to start listening</p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-[#F6BD60]/80 to-[#F4A261]/80 hover:from-[#F4A261]/90 hover:to-[#E76F51]/90 text-white px-6 py-3 rounded-xl shadow-sm transition-colors"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Upload Your First Track
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Queue/Playlist */}
            <div className="lg:col-span-1">
              <Card className="bg-white/95 backdrop-blur-md border-[#F6BD60]/30 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#5E503F]">Your Library</h3>
                      <p className="text-sm text-[#5E503F]/70">All your uploaded tracks</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMultiSelect(!showMultiSelect)}
                        className="text-[#5E503F]/70 hover:text-[#5E503F] hover:bg-[#F6BD60]/20 p-2 rounded-lg transition-colors"
                      >
                        {showMultiSelect ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-[#F6BD60]/80 to-[#F4A261]/80 hover:from-[#F4A261]/90 hover:to-[#E76F51]/90 text-white rounded-xl shadow-sm transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Multi-select controls */}
                  {showMultiSelect && (
                    <div className="flex items-center mb-2 space-x-2">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="accent-[#F4A261] w-4 h-4 rounded"
                      />
                      <span className="text-xs text-[#5E503F]/70">Select All</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={selectedTracks.length === 0}
                        onClick={handleBulkDelete}
                        className="ml-auto text-[#5E503F]/70 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
                      </Button>
                    </div>
                  )}
                  
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-3">
                      {filteredTracks.map((track) => (
                        <div
                          key={track.id}
                          className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-sm ${
                            currentTrack?.id === track.id 
                              ? 'bg-gradient-to-r from-[#F6BD60]/20 to-[#F4A261]/20 border-2 border-[#F4A261] shadow-sm' 
                              : 'bg-white/60 hover:bg-white/80 border border-[#F6BD60]/20'
                          }`}
                          onClick={() => playTrack(track)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {showMultiSelect && (
                                <input
                                  type="checkbox"
                                  checked={selectedTracks.includes(track.id)}
                                  onChange={e => {
                                    e.stopPropagation();
                                    handleSelectTrack(track.id);
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  className="accent-[#F4A261] w-4 h-4 rounded"
                                />
                              )}
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                currentTrack?.id === track.id 
                                  ? 'bg-gradient-to-br from-[#F6BD60] to-[#F4A261]' 
                                  : 'bg-[#F6BD60]/20'
                              }`}>
                                <FileAudio className={`w-5 h-5 ${
                                  currentTrack?.id === track.id ? 'text-white' : 'text-[#5E503F]/70'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${
                                  currentTrack?.id === track.id ? 'text-[#5E503F]' : 'text-[#5E503F]/90'
                                }`}>{track.name}</p>
                                <p className="text-sm text-[#5E503F]/70 truncate">{track.artist}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-[#5E503F]/80 bg-[#F6BD60]/20 px-2 py-1 rounded-md">
                                {track.duration}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteTrack(track.id);
                                }}
                                className="text-[#5E503F]/70 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {filteredTracks.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#F6BD60]/20 to-[#F4A261]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Music className="w-8 h-8 text-[#F4A261]" />
                          </div>
                          <h4 className="text-lg font-semibold text-[#5E503F] mb-2">
                            {searchQuery ? 'No tracks found' : 'Your library is empty'}
                          </h4>
                          <p className="text-[#5E503F]/70 text-sm mb-4">
                            {searchQuery ? 'Try a different search term' : 'Upload your first track to get started'}
                          </p>
                          {!searchQuery && (
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-gradient-to-r from-[#F6BD60]/80 to-[#F4A261]/80 hover:from-[#F4A261]/90 hover:to-[#E76F51]/90 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Music
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Browse All Tracks Modal */}
      <Dialog open={showBrowseModal} onOpenChange={setShowBrowseModal}>
        <DialogContent className="bg-white/95 backdrop-blur-md border-[#F6BD60]/30 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#5E503F] text-2xl font-bold">Browse All Tracks</DialogTitle>
            <DialogDescription className="text-[#5E503F]/70">
              Search and browse through your entire music library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/90 border-[#F6BD60]/30 text-[#5E503F] placeholder:text-[#5E503F]/50 focus:border-[#F4A261] focus:ring-2 focus:ring-[#F6BD60]/20 rounded-xl"
            />
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      currentTrack?.id === track.id 
                        ? 'bg-gradient-to-r from-[#F6BD60]/20 to-[#F4A261]/20 border-2 border-[#F4A261] shadow-sm' 
                        : 'bg-white/60 hover:bg-white/80 border border-[#F6BD60]/20'
                    }`}
                    onClick={() => {
                      playTrack(track);
                      setShowBrowseModal(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          currentTrack?.id === track.id 
                            ? 'bg-gradient-to-br from-[#F6BD60] to-[#F4A261]' 
                            : 'bg-[#F6BD60]/20'
                        }`}>
                          <FileAudio className={`w-6 h-6 ${
                            currentTrack?.id === track.id ? 'text-white' : 'text-[#5E503F]/70'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${
                            currentTrack?.id === track.id ? 'text-[#5E503F]' : 'text-[#5E503F]/90'
                          }`}>{track.name}</p>
                          <p className="text-sm text-[#5E503F]/70 truncate">{track.artist}</p>
                          <p className="text-xs text-[#5E503F]/50">
                            Uploaded {track.uploadedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-[#5E503F]/80 bg-[#F6BD60]/20 px-2 py-1 rounded-md">
                          {track.duration}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteTrack(track.id);
                            setShowBrowseModal(false);
                          }}
                          className="text-[#5E503F]/70 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBrowseModal(false)}
              className="border-[#F6BD60]/30 text-[#5E503F] hover:bg-[#F6BD60]/20"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-md border-[#F6BD60]/30">
          <DialogHeader>
            <DialogTitle className="text-[#5E503F] text-xl font-bold">Confirm Delete</DialogTitle>
            <DialogDescription className="text-[#5E503F]/70">
              {deleteTarget?.type === 'single' 
                ? 'Are you sure you want to delete this track? This action cannot be undone.'
                : `Are you sure you want to delete ${selectedTracks.length} selected track${selectedTracks.length > 1 ? 's' : ''}? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-[#F6BD60]/30 text-[#5E503F] hover:bg-[#F6BD60]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalMusic; 