import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { apiService, Tag } from '../services/api';

const Tags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTags();
      setTags(response.tags || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (tag: Tag, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTagToDelete(tag);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTagToDelete(null);
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;

    try {
      setDeleting(true);
      await apiService.deleteTag(tagToDelete.id);
      setTags(tags.filter(t => t.id !== tagToDelete.id));
      closeDeleteModal();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tag');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-background-dark dark:text-background-light">Tags</h1>
          <p className="text-background-dark/60 dark:text-background-light/60 mt-1">
            Browse and filter your notes by tags
          </p>
        </header>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-background-dark/60 dark:text-background-light/60">Loading tags...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={loadTags}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {tags.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏷️</div>
                <h2 className="text-2xl font-bold text-background-dark dark:text-background-light mb-2">
                  No tags yet
                </h2>
                <p className="text-background-dark/60 dark:text-background-light/60 mb-6">
                  Tags will appear here as you create notes with tags
                </p>
                <Link
                  to="/my/notes"
                  className="inline-block h-10 px-6 rounded-lg bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-colors"
                >
                  View Notes
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-background-dark/60 dark:text-background-light/60">
                    {tags.length} {tags.length === 1 ? 'tag' : 'tags'} total
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="relative group bg-background-light dark:bg-background-dark/60 p-6 rounded-xl border border-primary/10 dark:border-primary/20 hover:border-primary/30 dark:hover:border-primary/40 transition-all hover:shadow-lg"
                    >
                      <Link
                        to={`/my/notes?tag=${encodeURIComponent(tag.name)}`}
                        className="block"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                            🏷️
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-background-dark dark:text-background-light mb-1 truncate">
                          {tag.name}
                        </h3>
                        <p className="text-sm text-background-dark/60 dark:text-background-light/60">
                          Click to filter notes
                        </p>
                      </Link>
                      <button
                        onClick={(e) => openDeleteModal(tag, e)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs font-medium rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30"
                        title="Delete tag"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && tagToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background-light dark:bg-background-dark rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-primary/20">
              <h2 className="text-2xl font-bold text-background-dark dark:text-background-light mb-4">
                Delete Tag "{tagToDelete.name}"?
              </h2>
              <p className="text-background-dark/70 dark:text-background-light/70 mb-6">
                ⚠️ Warning: This will permanently delete the tag and <strong>all notes</strong> associated with it. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-background-dark/5 dark:bg-background-light/5 text-background-dark dark:text-background-light hover:bg-background-dark/10 dark:hover:bg-background-light/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tags;
