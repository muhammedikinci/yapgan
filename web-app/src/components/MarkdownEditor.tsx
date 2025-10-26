import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MarkdownEditor = ({ value, onChange, placeholder }: MarkdownEditorProps) => {
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 px-4 py-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              viewMode === 'edit'
                ? 'bg-primary text-white'
                : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              viewMode === 'split'
                ? 'bg-primary text-white'
                : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            ⚡ Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              viewMode === 'preview'
                ? 'bg-primary text-white'
                : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            👁️ Preview
          </button>
        </div>
        <div className="text-xs text-black/50 dark:text-white/50">
          Markdown supported • Use [[Note Title]] to link
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex" style={{ minHeight: '400px' }}>
        {/* Editor Panel */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2 border-r border-black/10 dark:border-white/10' : 'w-full'}>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || 'Write your note in Markdown...\n\n# Heading\n**bold** *italic*\n- list item\n```js\ncode block\n```\n\n[[Link to another note]]'}
              className="w-full h-full p-4 bg-transparent text-black dark:text-white resize-none focus:outline-none font-mono text-sm"
              style={{ minHeight: '400px' }}
            />
          </div>
        )}

        {/* Preview Panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2 overflow-auto' : 'w-full overflow-auto'}>
            <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
              >
                {value || '*Preview will appear here...*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
