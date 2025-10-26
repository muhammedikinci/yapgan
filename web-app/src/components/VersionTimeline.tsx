import { useState } from 'react';
import { NoteVersion } from '../services/api';

interface VersionTimelineProps {
  noteId: string;
  versions: NoteVersion[];
  currentVersion: number;
  onVersionSelect: (version: NoteVersion) => void;
  onViewDiff: () => void;
  onRestore: () => void;
  selectedVersion: NoteVersion | null;
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  currentVersion,
  onVersionSelect,
  onViewDiff,
  onRestore,
  selectedVersion,
}) => {
  const [hoveredVersion, setHoveredVersion] = useState<number | null>(null);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handlePrevious = () => {
    if (!selectedVersion) return;
    const currentIdx = versions.findIndex(v => v.version_number === selectedVersion.version_number);
    if (currentIdx < versions.length - 1) {
      onVersionSelect(versions[currentIdx + 1]);
    }
  };

  const handleNext = () => {
    if (!selectedVersion) return;
    const currentIdx = versions.findIndex(v => v.version_number === selectedVersion.version_number);
    if (currentIdx > 0) {
      onVersionSelect(versions[currentIdx - 1]);
    }
  };

  const canGoPrevious = () => {
    if (!selectedVersion) return false;
    return selectedVersion.version_number > 1;
  };

  const canGoNext = () => {
    if (!selectedVersion) return false;
    return selectedVersion.version_number < currentVersion;
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        📜 Version History ({versions.length} version{versions.length !== 1 ? 's' : ''})
      </h3>

      {/* Horizontal Timeline */}
      <div className="relative mb-6">
        {/* Timeline Line */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600" />

        {/* Version Dots */}
        <div className="relative flex items-start gap-2 overflow-x-auto pb-2">
          {[...versions].reverse().map((version) => (
            <div
              key={version.id}
              className="relative flex flex-col items-center min-w-[100px] flex-shrink-0"
              onMouseEnter={() => setHoveredVersion(version.version_number)}
              onMouseLeave={() => setHoveredVersion(null)}
            >
              {/* Dot */}
              <button
                onClick={() => onVersionSelect(version)}
                className={`
                  relative z-10 rounded-full transition-all duration-200
                  ${
                    selectedVersion?.version_number === version.version_number
                      ? 'w-6 h-6 bg-blue-600 ring-4 ring-blue-200 dark:ring-blue-900'
                      : version.version_number === currentVersion
                      ? 'w-5 h-5 bg-green-600 hover:ring-4 hover:ring-green-200 dark:hover:ring-green-900'
                      : 'w-4 h-4 bg-gray-400 dark:bg-gray-500 hover:bg-gray-500 dark:hover:bg-gray-400 hover:w-5 hover:h-5'
                  }
                `}
                title={`Version ${version.version_number}`}
              />

              {/* Version Info */}
              <div className="mt-2 text-center">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  v{version.version_number}
                  {version.version_number === currentVersion && (
                    <span className="ml-1 text-green-600 dark:text-green-400">●</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatTimeAgo(version.created_at)}
                </div>
                {(hoveredVersion === version.version_number || selectedVersion?.version_number === version.version_number) && version.change_summary && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-[120px] break-words">
                    {version.change_summary}
                  </div>
                )}
                {(hoveredVersion === version.version_number || selectedVersion?.version_number === version.version_number) && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {version.chars_added > 0 && `+${version.chars_added}`}
                    {version.chars_removed > 0 && ` -${version.chars_removed}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious()}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ◀ Previous
        </button>

        <button
          onClick={onViewDiff}
          disabled={!selectedVersion || selectedVersion.version_number === 1}
          className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={selectedVersion?.version_number === 1 ? 'No previous version to compare' : `View changes from v${(selectedVersion?.version_number ?? 1) - 1} to v${selectedVersion?.version_number}`}
        >
          🔍 View Diff
        </button>

        <button
          onClick={onRestore}
          disabled={!selectedVersion || selectedVersion.version_number === currentVersion}
          className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ⏮️ Restore This Version
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next ▶
        </button>

        {selectedVersion && (
          <div className="ml-auto text-sm text-gray-600 dark:text-gray-400 py-1.5">
            Viewing: <span className="font-semibold">Version {selectedVersion.version_number}</span>
            {selectedVersion.version_number === currentVersion && (
              <span className="ml-2 text-green-600 dark:text-green-400">(Current)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionTimeline;
