import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiService, Note, BacklinksResponse, NoteVersion, VersionDiff, ListVersionsResponse } from '../services/api';
import VersionTimeline from '../components/VersionTimeline';
import DiffViewerModal from '../components/DiffViewerModal';

const NoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  
  // Version history state
  const [versions, setVersions] = useState<ListVersionsResponse | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diff, setDiff] = useState<VersionDiff | null>(null);

  useEffect(() => {
    if (id) {
      loadNote(id);
      loadBacklinks(id);
      loadVersions(id);
    }
  }, [id]);

  const loadNote = async (noteId: string) => {
    try {
      setLoading(true);
      const response = await apiService.getNote(noteId);
      setNote(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load note');
      console.error('Error loading note:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBacklinks = async (noteId: string) => {
    try {
      const response = await apiService.getBacklinks(noteId);
      setBacklinks(response);
    } catch (err) {
      console.error('Error loading backlinks:', err);
    }
  };
  
  const loadVersions = async (noteId: string) => {
    try {
      const response = await apiService.listVersions(noteId);
      setVersions(response);
      // Auto-select current version
      if (response.versions.length > 0) {
        setSelectedVersion(response.versions[0]);
      }
    } catch (err) {
      console.error('Error loading versions:', err);
    }
  };
  
  const handleVersionSelect = (version: NoteVersion) => {
    setSelectedVersion(version);
  };
  
  const handleViewDiff = async () => {
    if (!selectedVersion || !versions || !id) return;
    
    // Version 1 için diff yok (öncesi yok)
    if (selectedVersion.version_number === 1) {
      alert('Version 1 is the initial version, no previous version to compare.');
      return;
    }
    
    try {
      const selectedV = selectedVersion.version_number;
      const previousV = selectedV - 1; // Bir önceki version
      
      // Get diff between PREVIOUS version and SELECTED version
      // This shows: "What changed from v(N-1) to vN"
      const diffData = await apiService.getVersionDiff(id, previousV, selectedV);
      setDiff(diffData);
      setShowDiffModal(true);
    } catch (err) {
      console.error('Error loading diff:', err);
      alert('Failed to load version diff');
    }
  };
  
  const handleRestore = async () => {
    if (!selectedVersion || !id) return;
    
    const confirmMsg = `Are you sure you want to restore to version ${selectedVersion.version_number}?\n\nThis will create a new version with the content from v${selectedVersion.version_number}.`;
    if (!confirm(confirmMsg)) return;
    
    try {
      await apiService.restoreVersion(id, selectedVersion.id);
      
      // Reload everything
      await loadNote(id);
      await loadVersions(id);
      setShowDiffModal(false);
      
      alert(`Successfully restored to version ${selectedVersion.version_number}!`);
    } catch (err) {
      console.error('Error restoring version:', err);
      alert('Failed to restore version');
    }
  };

  const handleShare = async () => {
    if (!note || !id) return;

    try {
      setShareLoading(true);
      const response = await apiService.shareNote(id, !note.is_public);
      
      // Update note with new sharing status
      setNote({ ...note, is_public: response.is_public, public_slug: response.public_slug });
      
      if (response.is_public && response.public_url) {
        // Copy URL to clipboard
        await navigator.clipboard.writeText(response.public_url);
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error sharing note:', err);
      alert('Failed to share note');
    } finally {
      setShareLoading(false);
    }
  };

  const copyPublicUrl = () => {
    if (!note?.public_slug) return;
    const publicUrl = `${window.location.origin}/public/${note.public_slug}`;
    navigator.clipboard.writeText(publicUrl);
    setShowShareSuccess(true);
    setTimeout(() => setShowShareSuccess(false), 3000);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-black/60 dark:text-white/60">Loading note...</div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error || 'Note not found'}</div>
          <Link to="/my/notes" className="text-primary hover:underline">
            ← Back to notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 px-10 py-3">
        <div className="flex items-center gap-4">
          <Link to="/my/dashboard" className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 hover:text-primary">
            Yapgan
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          {/* Share Button */}
          <div className="relative">
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                note.is_public
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {shareLoading ? (
                '⏳'
              ) : note.is_public ? (
                <>
                  🌐 Public
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              ) : (
                <>
                  🔒 Private
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </>
              )}
            </button>
            {showShareSuccess && (
              <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-lg text-sm whitespace-nowrap shadow-lg">
                ✓ Link copied to clipboard!
              </div>
            )}
          </div>
          {/* Copy Public URL Button (only show if public) */}
          {note.is_public && note.public_slug && (
            <button
              onClick={copyPublicUrl}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
              title="Copy public link"
            >
              📋 Copy Link
            </button>
          )}
          <Link 
            to={`/my/edit-note/${id}`}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
          >
            ✏️ Edit Note
          </Link>
          <Link 
            to={`/my/notes/${id}/chat`}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            💬 Chat with AI
          </Link>
          <Link 
            to="/my/notes"
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary"
          >
            ← Back to Notes
          </Link>
        </div>
      </header>
      
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
            <Link className="hover:text-primary dark:hover:text-primary" to="/my/notes">Notes</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-gray-100">{note.title}</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {note.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Created {formatDate(note.created_at)}
              </div>
              {note.updated_at !== note.created_at && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Updated {formatDate(note.updated_at)}
                </div>
              )}
              {note.is_public && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {note.view_count} views
                </div>
              )}
            </div>
            {note.source_url && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                <a 
                  className="text-sm text-primary underline hover:text-primary/80" 
                  href={note.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {note.source_url}
                </a>
              </div>
            )}
          </div>
          
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, idx) => (
                <div key={`${note.id}-tag-${idx}`} className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/10 px-3">
                  <p className="text-sm font-medium text-primary">{tag}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Version Timeline */}
          {versions && versions.versions.length > 0 && (
            <VersionTimeline
              noteId={id!}
              versions={versions.versions}
              currentVersion={versions.current_version}
              selectedVersion={selectedVersion}
              onVersionSelect={handleVersionSelect}
              onViewDiff={handleViewDiff}
              onRestore={handleRestore}
            />
          )}
          
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content_md}
            </ReactMarkdown>
          </article>

          {/* Backlinks Section */}
          {backlinks && ((backlinks.backlinks && backlinks.backlinks.length > 0) || (backlinks.outlinks && backlinks.outlinks.length > 0)) && (
            <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
                🔗 Linked Notes
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Backlinks - Notes linking TO this note */}
                {backlinks.backlinks && backlinks.backlinks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
                      ← Referenced By ({backlinks.backlinks.length})
                    </h3>
                    <div className="space-y-2">
                      {backlinks.backlinks.map((linkedNote) => (
                        <Link
                          key={linkedNote.id}
                          to={`/my/notes/${linkedNote.id}`}
                          className="block p-3 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                        >
                          <p className="text-sm font-medium text-black dark:text-white">
                            {linkedNote.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outlinks - Notes this note links TO */}
                {backlinks.outlinks && backlinks.outlinks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
                      → Links To ({backlinks.outlinks.length})
                    </h3>
                    <div className="space-y-2">
                      {backlinks.outlinks.map((linkedNote) => (
                        <Link
                          key={linkedNote.id}
                          to={`/my/notes/${linkedNote.id}`}
                          className="block p-3 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-colors"
                        >
                          <p className="text-sm font-medium text-black dark:text-white">
                            {linkedNote.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Diff Viewer Modal */}
      {showDiffModal && diff && (
        <DiffViewerModal
          diff={diff}
          onClose={() => setShowDiffModal(false)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
};

export default NoteDetail;
