import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MarkdownEditor from "../components/MarkdownEditor";
import { apiService } from "../services/api";

const NewNote = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count characters in content
  const charCount = content.trim().length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parse tags
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Create note
      const note = await apiService.createNote({
        title: title.trim(),
        content_md: content.trim(),
        source_url: sourceUrl.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
      });

      // Redirect to note detail page
      navigate(`/my/notes/${note.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-background-dark dark:text-background-light">
            New Note
          </h1>
          <p className="text-background-dark/60 dark:text-background-light/60 mt-1">
            Create a new note with optional tags
          </p>
        </header>

        <div className="max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-background-dark dark:text-background-light mb-2"
              >
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title..."
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-primary/20 dark:border-primary/30 bg-background-light dark:bg-background-dark/60 text-background-dark dark:text-background-light placeholder:text-background-dark/40 dark:placeholder:text-background-light/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Content */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-background-dark dark:text-background-light">
                  Content *
                </label>
              </div>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="Write your note in Markdown..."
              />
              <p className="mt-2 text-xs text-background-dark/60 dark:text-background-light/60">
                Supports Markdown formatting. Use [[Note Title]] to link to
                other notes.
              </p>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-background-dark dark:text-background-light mb-2"
              >
                Tags (optional)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="javascript, react, tutorial"
                className="w-full px-4 py-3 rounded-lg border border-primary/20 dark:border-primary/30 bg-background-light dark:bg-background-dark/60 text-background-dark dark:text-background-light placeholder:text-background-dark/40 dark:placeholder:text-background-light/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="mt-2 text-xs text-background-dark/60 dark:text-background-light/60">
                Separate tags with commas
              </p>
            </div>

            {/* Source URL */}
            <div>
              <label
                htmlFor="sourceUrl"
                className="block text-sm font-medium text-background-dark dark:text-background-light mb-2"
              >
                Source URL (optional)
              </label>
              <input
                type="url"
                id="sourceUrl"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-3 rounded-lg border border-primary/20 dark:border-primary/30 bg-background-light dark:bg-background-dark/60 text-background-dark dark:text-background-light placeholder:text-background-dark/40 dark:placeholder:text-background-light/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-8 rounded-lg bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Note"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/notes")}
                className="h-12 px-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm tracking-wide hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewNote;
