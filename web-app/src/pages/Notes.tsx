import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiService, Note, Tag, SearchResult } from '../services/api';

const Notes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Initialize selectedTag from URL immediately (synchronously)
  const initialTag = searchParams.get('tag');
  const [initialized, setInitialized] = useState(false);

  // Load data on mount
  useEffect(() => {
    // Set tag from URL first
    if (initialTag) {
      setSelectedTag(initialTag);
    }
    
    // Load tags
    loadTags();
    
    // Mark as initialized so notes will load
    setInitialized(true);
  }, []);

  // Sync selectedTag when URL changes (for navigation)
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    setSelectedTag(tagParam || null);
  }, [searchParams]);

  // Load notes when page or selectedTag changes (but only after initialized)
  useEffect(() => {
    if (initialized) {
      loadNotes();
    }
  }, [currentPage, selectedTag, initialized]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotes({
        page: currentPage,
        per_page: 10,
        ...(selectedTag && { tags: [selectedTag] })
      });
      setNotes(response.notes || []);
      setTotalPages(response.total_pages || 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await apiService.getTags();
      setAllTags(response.tags || []);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    // Validate search query length (min 2, max 50 characters)
    if (trimmedQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }
    
    if (trimmedQuery.length > 50) {
      setError('Search query must be at most 50 characters');
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);
      const response = await apiService.search(trimmedQuery, 20);
      setSearchResults(response.results);
      setIsSearchMode(true);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSearchResults([]);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-background-light/80 bg-background-light/80 px-10 py-3 backdrop-blur-sm dark:border-background-dark/80 dark:bg-background-dark/80">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-black dark:text-white">
            <Link to="/my/dashboard" className="text-xl font-bold hover:text-primary transition-colors">Yapgan</Link>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/my/dashboard" className="text-sm font-medium text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white">Home</Link>
            <Link to="/my/notes" className="text-sm font-medium text-primary">Notes</Link>
            <Link to="/my/tags" className="text-sm font-medium text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white">Tags</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input 
                className="w-64 rounded-lg border-none bg-background-light/50 py-2 px-4 text-sm text-black dark:bg-background-dark/50 dark:text-white" 
                placeholder="Search notes..." 
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={50}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <span className={`text-xs ${searchQuery.length < 2 || searchQuery.length > 50 ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'}`}>
                {searchQuery.length} / 50 characters
              </span>
            )}
          </form>
          <button 
            onClick={() => window.location.href = '/my/new-note'}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-opacity hover:opacity-90"
            title="New Note"
          >
            +
          </button>
        </div>
      </header>
      
      <div className="flex flex-1">
        <aside className="sticky top-[65px] h-[calc(100vh-65px)] w-80 shrink-0 overflow-y-auto border-r border-black/5 p-6 dark:border-white/5">
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">Filters</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    setSelectedTag(null);
                    setCurrentPage(1);
                    navigate('/notes');
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    !selectedTag
                      ? 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30'
                      : 'bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button 
                    key={tag.id}
                    onClick={() => {
                      setSelectedTag(tag.name);
                      setCurrentPage(1);
                      navigate(`/my/notes?tag=${encodeURIComponent(tag.name)}`);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      selectedTag === tag.name
                        ? 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30'
                        : 'bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
        
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-black dark:text-white">
                {isSearchMode ? 'Search Results' : 'All Notes'}
              </h2>
              <p className="text-black/60 dark:text-white/60">
                {isSearchMode 
                  ? `Found ${searchResults.length} results for "${searchQuery}"`
                  : 'Browse and filter all your captured notes.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Search Results */}
            {isSearchMode && (
              <>
                {searchLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-black/60 dark:text-white/60">Searching...</div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-black/60 dark:text-white/60">No results found for "{searchQuery}"</p>
                      <button
                        onClick={clearSearch}
                        className="mt-4 text-sm text-primary hover:underline"
                      >
                        Clear search
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {searchResults.map((result) => (
                      <Link 
                        key={result.note_id} 
                        to={`/my/notes/${result.note_id}`}
                        className="flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 text-2xl">
                          🔍
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-black dark:text-white">{result.title}</p>
                          <p className="text-sm text-black/60 dark:text-white/60">
                            Relevance: {(result.score * 100).toFixed(1)}%
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Regular Notes List */}
            {!isSearchMode && (
              <>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-black/60 dark:text-white/60">Loading notes...</div>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-black/60 dark:text-white/60">No notes found. Create your first note!</div>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-black/5 dark:divide-white/5">
                      {notes.map((note) => (
                        <div 
                      key={note.id} 
                      className="group flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Link to={`/my/notes/${note.id}`} className="flex items-center gap-4 flex-1">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 text-2xl">
                          📄
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-black dark:text-white">{note.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-black/60 dark:text-white/60">
                              Created on {formatDate(note.created_at)}
                            </p>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex gap-1">
                                {note.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={`${note.id}-${tag}-${idx}`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                      <Link
                        to={`/my/edit-note/${note.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30"
                      >
                        ✏️ Edit
                      </Link>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-black/60 dark:text-white/60">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notes;
