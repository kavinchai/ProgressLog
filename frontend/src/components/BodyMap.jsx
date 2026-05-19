import { getHeatLevel } from '../utils/muscleMapping';
import './BodyMap.css';

const FRONT_PATHS = {
  shoulders: [
    'M 58,72 Q 48,74 42,82 Q 38,90 40,98 L 50,92 Q 54,84 58,78 Z',
    'M 142,72 Q 152,74 158,82 Q 162,90 160,98 L 150,92 Q 146,84 142,78 Z',
  ],
  chest: [
    'M 72,88 Q 68,84 58,78 L 58,72 Q 80,68 100,68 Q 120,68 142,72 L 142,78 Q 132,84 128,88 Q 116,98 100,100 Q 84,98 72,88 Z',
  ],
  biceps: [
    'M 40,98 L 50,92 Q 48,108 44,124 Q 40,130 36,124 Q 34,112 40,98 Z',
    'M 160,98 L 150,92 Q 152,108 156,124 Q 160,130 164,124 Q 166,112 160,98 Z',
  ],
  triceps: [
    'M 36,124 Q 40,130 44,124 Q 46,136 44,148 Q 40,146 36,148 Q 34,136 36,124 Z',
    'M 164,124 Q 160,130 156,124 Q 154,136 156,148 Q 160,146 164,148 Q 166,136 164,124 Z',
  ],
  forearms: [
    'M 36,148 Q 40,146 44,148 Q 46,166 44,184 Q 40,186 36,184 Q 34,166 36,148 Z',
    'M 164,148 Q 160,146 156,148 Q 154,166 156,184 Q 160,186 164,184 Q 166,166 164,148 Z',
  ],
  core: [
    'M 80,100 Q 88,104 100,106 Q 112,104 120,100 L 120,152 Q 112,156 100,158 Q 88,156 80,152 Z',
  ],
  quads: [
    'M 76,152 L 80,152 Q 88,156 96,158 L 96,220 Q 88,224 82,220 Q 76,200 74,180 Q 74,164 76,152 Z',
    'M 124,152 L 120,152 Q 112,156 104,158 L 104,220 Q 112,224 118,220 Q 124,200 126,180 Q 126,164 124,152 Z',
  ],
  calves: [
    'M 78,230 Q 82,224 88,228 Q 86,250 84,270 Q 80,278 78,270 Q 76,250 78,230 Z',
    'M 122,230 Q 118,224 112,228 Q 114,250 116,270 Q 120,278 122,270 Q 124,250 122,230 Z',
  ],
};

const BACK_PATHS = {
  shoulders: [
    'M 258,72 Q 248,74 242,82 Q 238,90 240,98 L 250,92 Q 254,84 258,78 Z',
    'M 342,72 Q 352,74 358,82 Q 362,90 360,98 L 350,92 Q 346,84 342,78 Z',
  ],
  back: [
    'M 272,88 Q 268,84 258,78 L 258,72 Q 280,68 300,68 Q 320,68 342,72 L 342,78 Q 332,84 328,88 Q 316,98 300,100 Q 284,98 272,88 Z',
    'M 280,100 Q 288,104 300,106 Q 312,104 320,100 L 320,140 Q 312,144 300,146 Q 288,144 280,140 Z',
  ],
  triceps: [
    'M 240,98 L 250,92 Q 248,108 244,124 Q 240,130 236,124 Q 234,112 240,98 Z',
    'M 360,98 L 350,92 Q 352,108 356,124 Q 360,130 364,124 Q 366,112 360,98 Z',
  ],
  biceps: [
    'M 236,124 Q 240,130 244,124 Q 246,136 244,148 Q 240,146 236,148 Q 234,136 236,124 Z',
    'M 364,124 Q 360,130 356,124 Q 354,136 356,148 Q 360,146 364,148 Q 366,136 364,124 Z',
  ],
  forearms: [
    'M 236,148 Q 240,146 244,148 Q 246,166 244,184 Q 240,186 236,184 Q 234,166 236,148 Z',
    'M 364,148 Q 360,146 356,148 Q 354,166 356,184 Q 360,186 364,184 Q 366,166 364,148 Z',
  ],
  glutes: [
    'M 280,140 Q 288,144 300,146 Q 312,144 320,140 L 320,168 Q 312,172 300,174 Q 288,172 280,168 Z',
  ],
  hamstrings: [
    'M 276,168 L 280,168 Q 288,172 296,174 L 296,230 Q 288,234 282,230 Q 276,210 274,190 Q 274,178 276,168 Z',
    'M 324,168 L 320,168 Q 312,172 304,174 L 304,230 Q 312,234 318,230 Q 324,210 326,190 Q 326,178 324,168 Z',
  ],
  calves: [
    'M 278,240 Q 282,234 288,238 Q 286,260 284,280 Q 280,288 278,280 Q 276,260 278,240 Z',
    'M 322,240 Q 318,234 312,238 Q 314,260 316,280 Q 320,288 322,280 Q 324,260 322,240 Z',
  ],
};

function MuscleRegion({ muscle, paths, stats, selectedMuscle, onSelectMuscle }) {
  const heat = getHeatLevel(stats[muscle]?.count ?? 0);
  const isSelected = selectedMuscle === muscle;
  const className = `muscle-region heat-${heat}${isSelected ? ' muscle-selected' : ''}`;

  return (
    <g
      data-muscle={muscle}
      className={className}
      onClick={() => onSelectMuscle(isSelected ? null : muscle)}
      style={{ cursor: 'pointer' }}
    >
      {paths.map((d, i) => (
        <path key={`${muscle}-${i}`} d={d} />
      ))}
    </g>
  );
}

function collectPaths(pathMap) {
  const result = {};
  for (const [muscle, paths] of Object.entries(pathMap)) {
    if (!result[muscle]) result[muscle] = [];
    result[muscle].push(...paths);
  }
  return result;
}

export default function BodyMap({ muscleStats, onSelectMuscle, selectedMuscle }) {
  const frontMuscles = collectPaths(FRONT_PATHS);
  const backMuscles = collectPaths(BACK_PATHS);

  const allMuscles = {};
  for (const [muscle, paths] of Object.entries(frontMuscles)) {
    allMuscles[muscle] = [...(allMuscles[muscle] ?? []), ...paths];
  }
  for (const [muscle, paths] of Object.entries(backMuscles)) {
    allMuscles[muscle] = [...(allMuscles[muscle] ?? []), ...paths];
  }

  return (
    <div className="body-map-container">
      <svg
        viewBox="0 0 400 300"
        className="body-map-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Front silhouette outline */}
        <g className="body-outline">
          <ellipse cx="100" cy="40" rx="22" ry="28" />
          <line x1="100" y1="68" x2="100" y2="68" />
          <path d="M 58,72 Q 80,66 100,66 Q 120,66 142,72 Q 162,80 164,100 Q 168,136 166,150 Q 164,170 160,188 Q 158,192 156,188 Q 148,168 142,150 Q 136,136 128,156 L 126,162 Q 126,180 124,200 Q 120,224 112,232 Q 108,228 104,222 L 104,300 Q 100,302 96,300 L 96,222 Q 92,228 88,232 Q 80,224 76,200 Q 74,180 74,162 L 72,156 Q 64,136 58,150 Q 52,168 44,188 Q 42,192 40,188 Q 36,170 34,150 Q 32,136 36,100 Q 38,80 58,72 Z" />
        </g>

        {/* Front label */}
        <text x="100" y="16" className="body-label">front</text>

        {/* Back silhouette outline */}
        <g className="body-outline">
          <ellipse cx="300" cy="40" rx="22" ry="28" />
          <path d="M 258,72 Q 280,66 300,66 Q 320,66 342,72 Q 362,80 364,100 Q 368,136 366,150 Q 364,170 360,188 Q 358,192 356,188 Q 348,168 342,150 Q 336,136 328,156 L 326,162 Q 326,180 324,200 Q 320,234 312,242 Q 308,238 304,232 L 304,300 Q 300,302 296,300 L 296,232 Q 292,238 288,242 Q 280,234 276,200 Q 274,180 274,162 L 272,156 Q 264,136 258,150 Q 252,168 244,188 Q 242,192 240,188 Q 236,170 234,150 Q 232,136 236,100 Q 238,80 258,72 Z" />
        </g>

        {/* Back label */}
        <text x="300" y="16" className="body-label">back</text>

        {/* Muscle regions */}
        {Object.entries(allMuscles).map(([muscle, paths]) => (
          <MuscleRegion
            key={muscle}
            muscle={muscle}
            paths={paths}
            stats={muscleStats}
            selectedMuscle={selectedMuscle}
            onSelectMuscle={onSelectMuscle}
          />
        ))}
      </svg>
    </div>
  );
}
