import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Shuffle, 
  Repeat,
  Download,
  Plus,
  Heart,
  MoreHorizontal,
  Music,
  ArrowLeft,
  Clock,
  TrendingUp,
  Star,
  ListMusic,
  Radio,
  Waves,
  Moon,
  Sun,
  AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  plays?: string;
  album?: string;
  isPopular?: boolean;
  mood?: string;
  streamUrl?: string;
  youtubeId?: string;
}

interface Playlist {
  id: string;
  name: string;
  cover: string;
  songCount: number;
  description?: string;
  mood?: string;
}

export default function MusicPlayer() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(142);
  const [duration, setDuration] = useState(215);
  const [volume, setVolume] = useState(0.7);
  const [activeSection, setActiveSection] = useState("discover");
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Get the previous page from localStorage or default to dashboard
  const getPreviousPage = () => {
    return localStorage.getItem('previousPage') || '/';
  };
  
  const handleBackNavigation = () => {
    const previousPage = getPreviousPage();
    localStorage.removeItem('previousPage');
    navigate(previousPage);
  };

  // Search function to get real YouTube results
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const results = await response.json();
      
      if (Array.isArray(results) && results.length > 0) {
        setSearchResults(results);
        setActiveSection("search");
        toast({
          title: "Search completed",
          description: `Found ${results.length} tracks`
        });
      } else {
        toast({
          title: "No results found",
          description: "Try a different search term",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      
      // Try to get error details from response
      let errorMessage = "Could not search for music. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Search temporarily unavailable",
        description: "YouTube is blocking searches right now. Try different search terms or wait a moment.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Remove demo data - only use real search results
  const calmCollection: Song[] = [];

  const moodPlaylists: Playlist[] = [];

  // Remove useEffect that sets demo song

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playPause = () => {
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    if (searchResults.length > 0) {
      const currentIndex = searchResults.findIndex(song => song.id === currentSong?.id);
      const nextIndex = (currentIndex + 1) % searchResults.length;
      setCurrentSong(searchResults[nextIndex]);
    }
  };

  const prevSong = () => {
    if (searchResults.length > 0) {
      const currentIndex = searchResults.findIndex(song => song.id === currentSong?.id);
      const prevIndex = currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1;
      setCurrentSong(searchResults[prevIndex]);
    }
  };

  // Remove duplicate search function - keep the one defined earlier

  const playTrack = async (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    
    // Get streaming URL if it's a YouTube track
    if (song.youtubeId) {
      try {
        const response = await fetch(`/api/music/stream/${song.youtubeId}`);
        if (response.ok) {
          const streamData = await response.json();
          if (audioRef.current && streamData.streamUrl) {
            audioRef.current.src = streamData.streamUrl;
            audioRef.current.play().catch(console.error);
          }
        } else {
          toast({
            title: "Playback failed",
            description: "Could not load this track",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Stream failed:', error);
        toast({
          title: "Playback error",
          description: "Connection problem occurred",
          variant: "destructive"
        });
      }
    }
  };

  const getMoodIcon = (mood?: string) => {
    switch(mood) {
      case "focused": return <Moon className="w-4 h-4" />;
      case "chill": return <Waves className="w-4 h-4" />;
      case "natural": return <Sun className="w-4 h-4" />;
      case "dreamy": return <Star className="w-4 h-4" />;
      default: return <Music className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-purple-50/30 to-pink-50/30">
      {/* Floating Header */}
      <div className="relative">
        <div className="absolute top-6 left-6 right-6 bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg z-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackNavigation}
                  className="text-stone-600 hover:text-purple-600 hover:bg-purple-50/50"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <div className="h-6 w-px bg-stone-300/50" />
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-2xl font-light bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    LuvNoir
                  </h1>
                </div>
              </div>
              
              {/* Floating Search */}
              <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <Input
                    placeholder="Find your calm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-12 py-3 bg-white/60 border-white/30 text-stone-700 placeholder-stone-500 focus:bg-white/80 transition-all rounded-xl backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-medium shadow-md">
                  M
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-24 pb-8 px-8 max-w-7xl mx-auto space-y-12">
        {/* Mood Navigation */}
        <div className="flex space-x-3 overflow-x-auto pb-2 pt-4">
          {[
            { id: "discover", label: "Discover", icon: TrendingUp },
            { id: "search", label: "Search Results", icon: Search },
            { id: "focus", label: "Focus", icon: Moon },
            { id: "relax", label: "Relax", icon: Waves },
            { id: "nature", label: "Nature", icon: Sun },
            { id: "favorites", label: "Favorites", icon: Heart }
          ].map((section) => {
            const Icon = section.icon;
            // Hide search tab if no results
            if (section.id === "search" && searchResults.length === 0) return null;
            
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection(section.id)}
                className={`whitespace-nowrap transition-all ${
                  activeSection === section.id 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg" 
                    : "bg-white/50 border-white/30 text-stone-700 hover:bg-white/70 backdrop-blur-sm"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {section.label}
                {section.id === "search" && searchResults.length > 0 && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {searchResults.length}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Welcome Message when no search results */}
        {!currentSong && searchResults.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-light text-stone-800 mb-4">YouTube Search Currently Blocked</h2>
            <p className="text-stone-600 text-lg mb-4">YouTube is actively blocking automated music searches with bot protection.</p>
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-yellow-800 mb-2">Technical Issue</h3>
              <p className="text-yellow-700 text-sm leading-relaxed">
                YouTube detects and blocks yt-dlp requests with "HTTP 429: Too Many Requests" and "Sign in to confirm you're not a bot" messages. 
                This is a platform-level restriction that affects all automated YouTube access.
              </p>
            </div>
          </div>
        )}

        {/* Now Playing - Minimalist Design */}
        {currentSong && (
          <div className="relative">
            <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-xl rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-12 gap-0 items-center">
                  <div className="col-span-4 p-8">
                    <div className="aspect-square bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-2xl flex items-center justify-center relative group cursor-pointer backdrop-blur-sm border border-white/30">
                      <Music className="w-20 h-20 text-purple-400/60" />
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <Play className="w-16 h-16 text-white drop-shadow-lg" />
                      </div>
                      {isPlaying && (
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                          <Waves className="w-5 h-5 text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-8 p-8 space-y-8">
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <span className="text-sm text-purple-600/80 font-medium tracking-wide">NOW PLAYING</span>
                        {currentSong.mood && (
                          <span className="px-3 py-1 bg-purple-100/50 text-purple-700 text-xs rounded-full border border-purple-200/50">
                            {currentSong.mood}
                          </span>
                        )}
                        {currentSong.isPopular && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <h2 className="text-5xl font-light text-stone-800 mb-3 leading-tight">{currentSong.title}</h2>
                      <p className="text-2xl text-stone-600 font-light">{currentSong.artist}</p>
                      {currentSong.album && (
                        <p className="text-sm text-stone-500 mt-2">{currentSong.album} • {currentSong.plays} plays</p>
                      )}
                    </div>
                    
                    {/* Minimalist Progress */}
                    <div className="space-y-4">
                      <div className="w-full bg-stone-200/50 rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-stone-500 font-light">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                    
                    {/* Floating Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <Button variant="ghost" size="lg" className="text-stone-500 hover:text-purple-600 hover:bg-purple-50/50 rounded-full w-12 h-12">
                          <Shuffle className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="lg" onClick={prevSong} className="text-stone-500 hover:text-purple-600 hover:bg-purple-50/50 rounded-full w-12 h-12">
                          <SkipBack className="w-6 h-6" />
                        </Button>
                        <Button 
                          onClick={playPause}
                          className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-xl hover:shadow-2xl transition-all"
                        >
                          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                        </Button>
                        <Button variant="ghost" size="lg" onClick={nextSong} className="text-stone-500 hover:text-purple-600 hover:bg-purple-50/50 rounded-full w-12 h-12">
                          <SkipForward className="w-6 h-6" />
                        </Button>
                        <Button variant="ghost" size="lg" className="text-stone-500 hover:text-purple-600 hover:bg-purple-50/50 rounded-full w-12 h-12">
                          <Repeat className="w-5 h-5" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm" className="text-stone-500 hover:text-red-500 hover:bg-red-50/50 rounded-full">
                          <Heart className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-stone-500 hover:text-purple-600 hover:bg-purple-50/50 rounded-full">
                          <Download className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center space-x-3">
                          <Volume2 className="w-5 h-5 text-stone-500" />
                          <div className="w-24 h-1.5 bg-stone-200/50 rounded-full">
                            <div 
                              className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                              style={{ width: `${volume * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Results */}
        {activeSection === "search" && searchResults.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-light text-stone-800">Search Results</h2>
              <p className="text-stone-600">{searchResults.length} tracks found</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {searchResults.map((song, index) => (
                <Card key={song.id} className="bg-white/60 backdrop-blur-xl border-white/40 shadow-lg hover:shadow-xl transition-all rounded-2xl overflow-hidden group cursor-pointer">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-12 gap-0 items-center p-6">
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          onClick={() => playTrack(song)}
                          variant="ghost" 
                          size="sm"
                          className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Play className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="col-span-2">
                        <div className="aspect-square bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-xl flex items-center justify-center relative">
                          {song.thumbnail && song.thumbnail !== '/api/placeholder/200/200' ? (
                            <img 
                              src={song.thumbnail} 
                              alt={song.title}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <Music className="w-8 h-8 text-purple-400/60" />
                          )}
                        </div>
                      </div>
                      <div className="col-span-7 px-6 space-y-2">
                        <h3 className="text-xl font-medium text-stone-800 line-clamp-1">{song.title}</h3>
                        <p className="text-stone-600 font-light">{song.artist}</p>
                        <div className="flex items-center space-x-4 text-sm text-stone-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{song.duration}</span>
                          </span>
                          {song.plays && (
                            <span className="flex items-center space-x-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{song.plays} plays</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Heart className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all">
                          <Download className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Show message for discover tab since no demo data */}
        {activeSection === "discover" && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-light text-stone-800 mb-4">Start by searching</h2>
            <p className="text-stone-600 text-lg">Use the search bar above to find any music from YouTube</p>
          </div>
        )}
        
        {/* Remove mood playlists demo section */}
      </div>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={nextSong}
      />
    </div>
  );
}