import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { apiService, VectorPoint } from '../services/api';

// Proper PCA implementation for dimensionality reduction
function performPCA(vectors: number[][]): { x: number; y: number }[] {
  if (vectors.length === 0) return [];
  
  const numPoints = vectors.length;
  const numDims = vectors[0].length;
  
  // Calculate mean for each dimension
  const mean = new Array(numDims).fill(0);
  for (let i = 0; i < numPoints; i++) {
    for (let j = 0; j < numDims; j++) {
      mean[j] += vectors[i][j];
    }
  }
  for (let j = 0; j < numDims; j++) {
    mean[j] /= numPoints;
  }
  
  // Center the data
  const centered = vectors.map(vec => 
    vec.map((val, idx) => val - mean[idx])
  );
  
  // For high-dimensional data (1536 dims), we use truncated SVD approach
  // Instead of computing full covariance matrix, we use power iteration
  // to find the top 2 principal components
  
  // Initialize first principal component randomly
  let pc1 = new Array(numDims).fill(0).map(() => Math.random() - 0.5);
  
  // Power iteration to find first principal component
  for (let iter = 0; iter < 20; iter++) {
    // Multiply by data matrix transpose
    const newPc1 = new Array(numDims).fill(0);
    for (let i = 0; i < numPoints; i++) {
      const dot = centered[i].reduce((sum, val, idx) => sum + val * pc1[idx], 0);
      for (let j = 0; j < numDims; j++) {
        newPc1[j] += dot * centered[i][j];
      }
    }
    
    // Normalize
    const norm = Math.sqrt(newPc1.reduce((sum, val) => sum + val * val, 0));
    pc1 = newPc1.map(val => val / norm);
  }
  
  // Remove first component from data
  const deflated = centered.map(vec => {
    const projection = vec.reduce((sum, val, idx) => sum + val * pc1[idx], 0);
    return vec.map((val, idx) => val - projection * pc1[idx]);
  });
  
  // Initialize second principal component
  let pc2 = new Array(numDims).fill(0).map(() => Math.random() - 0.5);
  
  // Make orthogonal to pc1
  const dot12 = pc2.reduce((sum, val, idx) => sum + val * pc1[idx], 0);
  pc2 = pc2.map((val, idx) => val - dot12 * pc1[idx]);
  
  // Power iteration for second component
  for (let iter = 0; iter < 20; iter++) {
    const newPc2 = new Array(numDims).fill(0);
    for (let i = 0; i < numPoints; i++) {
      const dot = deflated[i].reduce((sum, val, idx) => sum + val * pc2[idx], 0);
      for (let j = 0; j < numDims; j++) {
        newPc2[j] += dot * deflated[i][j];
      }
    }
    
    // Normalize
    const norm = Math.sqrt(newPc2.reduce((sum, val) => sum + val * val, 0));
    pc2 = newPc2.map(val => val / norm);
    
    // Re-orthogonalize
    const dot = pc2.reduce((sum, val, idx) => sum + val * pc1[idx], 0);
    pc2 = pc2.map((val, idx) => val - dot * pc1[idx]);
  }
  
  // Project data onto the two principal components
  const projected = centered.map(vec => {
    const x = vec.reduce((sum, val, idx) => sum + val * pc1[idx], 0);
    const y = vec.reduce((sum, val, idx) => sum + val * pc2[idx], 0);
    return { x, y };
  });
  
  return projected;
}

function VectorSpace() {
  const navigate = useNavigate();
  const [points, setPoints] = useState<VectorPoint[]>([]);
  const [projectedPoints, setProjectedPoints] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  useEffect(() => {
    loadVectorSpace();
  }, []);

  const loadVectorSpace = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getVectorSpace(1000);
      setPoints(response.points);
      
      // Perform PCA to reduce dimensions to 2D
      if (response.points.length > 0) {
        const vectors = response.points.map(p => p.vector);
        const projected = performPCA(vectors);
        setProjectedPoints(projected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vector space');
      console.error('Error loading vector space:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePointClick = (index: number) => {
    const point = points[index];
    if (point.note_id) {
      navigate(`/my/notes/${point.note_id}`);
    }
  };

  // Normalize coordinates to fit in SVG viewBox
  const xValues = projectedPoints.map(p => p.x);
  const yValues = projectedPoints.map(p => p.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  
  const padding = 30;
  const width = 500;
  const height = 400;
  
  const normalizeX = (x: number) => {
    return padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  };
  
  const normalizeY = (y: number) => {
    return padding + ((y - minY) / (maxY - minY)) * (height - 2 * padding);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-background-dark dark:text-background-light">Vector Space</h1>
          <p className="text-background-dark/60 dark:text-background-light/60 mt-1">
            Explore your notes in semantic space. Notes that are semantically similar appear closer together.
          </p>
          <p className="text-sm text-background-dark/50 dark:text-background-light/50 mt-2">
            {!loading && points.length > 0 && (
              <>Total notes: {points.length}</>
            )}
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-background-dark dark:text-background-light">Loading vector space...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadVectorSpace}
              className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && points.length === 0 && (
          <div className="bg-background-light dark:bg-background-dark/60 rounded-xl p-8 text-center border border-primary/10 dark:border-primary/20">
            <p className="text-background-dark/70 dark:text-background-light/70">
              No notes with vectors found. Create some notes first!
            </p>
          </div>
        )}

        {!loading && !error && points.length > 0 && (
          <>
            {/* Visualization */}
            <div className="bg-background-light dark:bg-background-dark/60 rounded-xl p-6 border border-primary/10 dark:border-primary/20">
              <svg
                width="70%"
                viewBox={`0 0 ${width} ${height}`}
                className="border border-primary/20 rounded"
                style={{ maxWidth: '70%', height: 'auto', overflow: 'visible' }}
              >
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="rgba(100,100,100,0.1)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width={width} height={height} fill="rgba(255,255,255,0.02)" />
                
                {/* Points */}
                {projectedPoints.map((point, index) => {
                  const cx = normalizeX(point.x);
                  const cy = normalizeY(point.y);
                  const isSelected = selectedPoint === index;
                  const isHovered = hoveredPoint === index;
                  
                  return (
                    <g key={index}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected || isHovered ? 8 : 5}
                        fill={isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#10b981'}
                        opacity={isSelected || isHovered ? 1 : 0.7}
                        stroke={isSelected || isHovered ? '#fff' : 'none'}
                        strokeWidth={2}
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => {
                          setSelectedPoint(index);
                          handlePointClick(index);
                        }}
                        onMouseEnter={() => setHoveredPoint(index)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
                
                {/* Tooltips rendered last (on top) */}
                {projectedPoints.map((point, index) => {
                  const cx = normalizeX(point.x);
                  const cy = normalizeY(point.y);
                  const isHovered = hoveredPoint === index;
                  const note = points[index];
                  
                  if (!isHovered) return null;
                  
                  const titleText = note.title.length > 30 ? note.title.substring(0, 30) + '...' : note.title;
                  const textWidth = Math.min(note.title.length * 7 + 20, 250);
                  
                  // Smart positioning: keep tooltip within bounds
                  let tooltipX = cx + 12;
                  let tooltipY = cy - 20;
                  
                  // If too close to right edge, show on left
                  if (cx + textWidth + 12 > width - padding) {
                    tooltipX = cx - textWidth - 12;
                  }
                  
                  // If too close to top edge, show below
                  if (cy - 20 < padding) {
                    tooltipY = cy + 12;
                  }
                  
                  // If too close to bottom edge, show above
                  if (cy + 42 > height - padding) {
                    tooltipY = cy - 42;
                  }
                  
                  return (
                    <g key={`tooltip-${index}`} style={{ pointerEvents: 'none' }}>
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width={textWidth}
                        height="30"
                        fill="rgba(0, 0, 0, 0.95)"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        rx="6"
                      />
                      <text
                        x={tooltipX + 10}
                        y={tooltipY + 18}
                        fill="#fff"
                        fontSize="13"
                        fontWeight="600"
                      >
                        {titleText}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-6 flex gap-6 text-sm text-background-dark/60 dark:text-background-light/60">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Note</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span>Hovered</span>
              </div>
            </div>

            {/* Selected note info */}
            {selectedPoint !== null && (
              <div className="mt-6 bg-background-light dark:bg-background-dark/60 border border-primary/10 dark:border-primary/20 rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-2 text-background-dark dark:text-background-light">
                  {points[selectedPoint].title}
                </h3>
                {points[selectedPoint].tags && points[selectedPoint].tags!.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {points[selectedPoint].tags!.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm dark:bg-primary/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handlePointClick(selectedPoint)}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium"
                >
                  View Note
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default VectorSpace;
