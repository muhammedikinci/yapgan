import { VersionDiff } from '../services/api';

interface DiffViewerModalProps {
  diff: VersionDiff | null;
  onClose: () => void;
  onRestore: () => void;
}

const DiffViewerModal: React.FC<DiffViewerModalProps> = ({ diff, onClose, onRestore }) => {
  if (!diff) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Changes from v{diff.old_version.version_number} to v{diff.new_version.version_number}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date(diff.old_version.created_at).toLocaleString()} → {new Date(diff.new_version.created_at).toLocaleString()}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* Title Changes */}
          {diff.title_changed && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="text-lg">📝</span> Title:
              </h3>
              <div className="space-y-1">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-4 py-2 rounded-lg border-l-4 border-red-500">
                  <span className="font-mono text-sm">- {diff.old_version.title}</span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-4 py-2 rounded-lg border-l-4 border-green-500">
                  <span className="font-mono text-sm">+ {diff.new_version.title}</span>
                </div>
              </div>
            </div>
          )}

          {/* Content Diff */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-lg">📄</span> Content:
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              {diff.content_diff.map((line, idx) => (
                <div
                  key={idx}
                  className={`
                    py-0.5 px-2 -mx-2
                    ${line.type === 'added' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : ''}
                    ${line.type === 'removed' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : ''}
                    ${line.type === 'unchanged' ? 'text-gray-600 dark:text-gray-400' : ''}
                  `}
                >
                  <span className="text-gray-400 dark:text-gray-500 mr-4 select-none inline-block w-8 text-right">
                    {line.line_num}
                  </span>
                  {line.type === 'added' && <span className="text-green-600 dark:text-green-400 mr-2">+</span>}
                  {line.type === 'removed' && <span className="text-red-600 dark:text-red-400 mr-2">-</span>}
                  {line.type === 'unchanged' && <span className="opacity-0 mr-2">·</span>}
                  {line.content || <span className="text-gray-400">(empty line)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Tag Changes */}
          {((diff.tags_added && diff.tags_added.length > 0) || (diff.tags_removed && diff.tags_removed.length > 0)) && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="text-lg">🏷️</span> Tags:
              </h3>
              <div className="space-y-1">
                {diff.tags_removed && diff.tags_removed.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-4 py-2 rounded-lg border-l-4 border-red-500">
                    <span className="font-mono text-sm">
                      - {diff.tags_removed.join(', ')}
                    </span>
                  </div>
                )}
                {diff.tags_added && diff.tags_added.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-4 py-2 rounded-lg border-l-4 border-green-500">
                    <span className="font-mono text-sm">
                      + {diff.tags_added.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Summary</h4>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <div>
                <span className="font-medium">Changes:</span> {diff.old_version.change_summary || 'Initial version'} → {diff.new_version.change_summary}
              </div>
              <div>
                <span className="font-medium">Characters:</span>{' '}
                {diff.new_version.chars_added > 0 && (
                  <span className="text-green-600 dark:text-green-400">+{diff.new_version.chars_added}</span>
                )}
                {diff.new_version.chars_added > 0 && diff.new_version.chars_removed > 0 && ' '}
                {diff.new_version.chars_removed > 0 && (
                  <span className="text-red-600 dark:text-red-400">-{diff.new_version.chars_removed}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <span>⏮️</span>
            Restore v{diff.old_version.version_number}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiffViewerModal;
