import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, Pause, SkipBack, SkipForward, Volume2, Heart, Plus, List, X, Clock, User, Menu, Home, TrendingUp, Music, History, ThumbsUp, Share2, MoreVertical } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { apiRequest } from '../lib/queryClient';

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string };
      high: { url: string };
    };
    publishedAt: string;
    description: string;
  };
}

interface VideoDetails {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  description: string;
}

interface Playlist {
  id: string;
  name: string;
  videos: VideoDetails[];
}

const LuvNoirMusic: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoDetails | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');

  const playerRef = useRef<HTMLIFrameElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle broken thumbnail images
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/320x180/1f2937/9ca3af?text=No+Thumbnail';
  };

  // Check API key status on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await apiRequest('GET', '/api/youtube/search?q=test&maxResults=1');
        if (response.ok) {
          setApiKeyStatus('valid');
        } else {
          setApiKeyStatus('invalid');
        }
      } catch (error) {
        setApiKeyStatus('invalid');
      }
    };
    
    checkApiKey();
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('YouTube IFrame API ready');
    };
  }, []);

  // Search suggestions
  const getSearchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await apiRequest('GET', `/api/youtube/suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      // Handle different response formats
      let suggestionsArray: string[] = [];
      if (Array.isArray(data.suggestions)) {
        suggestionsArray = data.suggestions;
      } else if (typeof data.suggestions === 'string') {
        // If it's a string, split it into words or use it as a single suggestion
        suggestionsArray = [data.suggestions];
      } else if (data.suggestions) {
        // Try to convert to array if it's some other format
        suggestionsArray = Array.isArray(data.suggestions) ? data.suggestions : [];
      }
      
      setSuggestions(suggestionsArray);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      getSearchSuggestions(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, getSearchSuggestions]);

  const searchVideos = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=20`);
      const data = await response.json();
      setSearchResults(data.items || []);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playVideo = async (videoId: string) => {
    try {
      const response = await apiRequest('GET', `/api/youtube/video/${videoId}`);
      const data = await response.json();
      setCurrentVideo(data);
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to get video details:', error);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      } else {
        playerRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
      setIsPlaying(!isPlaying);
    }
  };

  const setPlayerVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.contentWindow?.postMessage(`{"event":"command","func":"setVolume","args":[${newVolume}]}`, '*');
    }
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      videos: []
    };

    setPlaylists([...playlists, newPlaylist]);
    setNewPlaylistName('');
    setShowPlaylistModal(false);
  };

  const addToPlaylist = (playlistId: string, video: VideoDetails) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          videos: [...playlist.videos, video]
        };
      }
      return playlist;
    }));
  };

  const removeFromPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          videos: playlist.videos.filter(video => video.id !== videoId)
        };
      }
      return playlist;
    }));
  };

  const formatDuration = (duration: string) => {
    return duration;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-pink-900 text-white">
      {/* API Key Status Banner */}
      {apiKeyStatus === 'invalid' && (
        <div className="bg-red-600/20 border-b border-red-500/30 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-200 text-sm font-medium">
                YouTube API key not configured. Please set up a real API key to use the app.
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="https://developers.google.com/youtube/v3/getting-started" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-red-300 hover:text-red-100 text-sm underline"
              >
                Get API Key
              </a>
              <span className="text-red-400 text-xs">|</span>
              <span className="text-red-300 text-xs">
                Set YOUTUBE_API_KEY in environment or replace placeholder in server/routes.ts
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-purple-300 hover:text-purple-100"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Music className="w-8 h-8 text-purple-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                LuvNoir
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for music..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyPress={(e) => e.key === 'Enter' && searchVideos(searchQuery)}
                className="bg-black/30 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
              />
              <Button
                size="sm"
                onClick={() => searchVideos(searchQuery)}
                className="absolute right-1 top-1 bg-purple-600 hover:bg-purple-700"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Search Suggestions */}
            {showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-b-lg mt-1 z-50">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-purple-500/20 cursor-pointer text-purple-200"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      searchVideos(suggestion);
                    }}
                  >
                    <Search className="w-4 h-4 inline mr-2 text-purple-400" />
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-100">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`bg-black/20 backdrop-blur-md border-r border-purple-500/20 transition-all duration-300 h-screen ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}>
          <nav className="p-4 space-y-4">
            <Button variant="ghost" className="w-full justify-start text-purple-300 hover:text-purple-100 h-12">
              <Home className="w-5 h-5 mr-3" />
              {sidebarOpen && 'Home'}
            </Button>
            <Button variant="ghost" className="w-full justify-start text-purple-300 hover:text-purple-100 h-12">
              <TrendingUp className="w-5 h-5 mr-3" />
              {sidebarOpen && 'Trending'}
            </Button>
            <Button variant="ghost" className="w-full justify-start text-purple-300 hover:text-purple-100 h-12">
              <Music className="w-5 h-5 mr-3" />
              {sidebarOpen && 'Music'}
            </Button>
            <Button variant="ghost" className="w-full justify-start text-purple-300 hover:text-purple-100 h-12">
              <History className="w-5 h-5 mr-3" />
              {sidebarOpen && 'History'}
            </Button>
          </nav>

          {sidebarOpen && (
            <div className="p-4 border-t border-purple-500/20 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-purple-300">Playlists</h3>
                <Button
                  size="sm"
                  onClick={() => setShowPlaylistModal(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-64">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="text-sm text-purple-200 hover:text-purple-100 cursor-pointer py-2 px-2 rounded hover:bg-purple-500/20 transition-colors"
                    onClick={() => setCurrentPlaylist(playlist)}
                  >
                    {playlist.name} ({playlist.videos.length})
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {currentVideo ? (
            <div className="space-y-6">
              {/* Video Player */}
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <div className="relative aspect-video">
                                     <iframe
                     ref={playerRef}
                     src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
                     className="w-full h-full"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     allowFullScreen
                   />
                </div>
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white mb-2">{currentVideo.title}</h1>
                    <div className="flex items-center space-x-4 text-purple-300">
                      <span>{currentVideo.artist}</span>
                      <span>•</span>
                      <span>{formatDuration(currentVideo.duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-100">
                      <ThumbsUp className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-100">
                      <Share2 className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-100">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={togglePlayPause}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-100">
                      <SkipBack className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-100">
                      <SkipForward className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-purple-300" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setPlayerVolume(parseInt(e.target.value))}
                        className="w-20 accent-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-black/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-purple-200 text-sm leading-relaxed">
                    {currentVideo.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to LuvNoir</h2>
              <p className="text-purple-300">Search for your favorite music to get started</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Search Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.map((video) => (
                  <Card
                    key={video.id.videoId}
                    className="bg-black/20 backdrop-blur-md border-purple-500/20 hover:border-purple-400/40 transition-all cursor-pointer group"
                    onClick={() => playVideo(video.id.videoId)}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={video.snippet.thumbnails.medium.url}
                        alt={video.snippet.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">
                        {video.snippet.title}
                      </h3>
                      <p className="text-purple-300 text-xs mb-1">{video.snippet.channelTitle}</p>
                      <p className="text-purple-400 text-xs">{formatDate(video.snippet.publishedAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          )}
        </main>
      </div>

      {/* Create Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 border border-purple-500/30 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Playlist</h3>
            <Input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="bg-black/30 border-purple-500/30 text-white placeholder:text-purple-300/50 mb-4"
            />
            <div className="flex space-x-2">
              <Button
                onClick={createPlaylist}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowPlaylistModal(false)}
                className="text-purple-300 hover:text-purple-100"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuvNoirMusic;