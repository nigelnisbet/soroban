import { motion } from 'framer-motion';
import { ALL_COURSE_LEVELS, CourseLevel } from '../../levels/courseLevels';
import { useCourseProgressStore } from '../../store/courseProgressStore';

interface CourseMapProps {
  onSelectLevel: (level: CourseLevel) => void;
}

const TRACK_COLORS = {
  foundation: { bg: '#E3F2FD', border: '#2196F3', text: '#1565C0' },
  expansion: { bg: '#F3E5F5', border: '#9C27B0', text: '#6A1B9A' },
  speed: { bg: '#FFEBEE', border: '#F44336', text: '#C62828' },
  addition: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
  multiplication: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100' },
};

export function CourseMap({ onSelectLevel }: CourseMapProps) {
  const { getLevelProgress, totalXP, streak } = useCourseProgressStore();

  // Group levels by track
  const levelsByTrack = {
    foundation: ALL_COURSE_LEVELS.filter(l => l.track === 'foundation'),
    expansion: ALL_COURSE_LEVELS.filter(l => l.track === 'expansion'),
    speed: ALL_COURSE_LEVELS.filter(l => l.track === 'speed'),
    addition: ALL_COURSE_LEVELS.filter(l => l.track === 'addition'),
    multiplication: ALL_COURSE_LEVELS.filter(l => l.track === 'multiplication'),
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header with stats - positioned below status bar */}
      <div
        style={{
          background: 'linear-gradient(180deg, #8B7355 0%, #6B5344 100%)',
          padding: '12px 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 50px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}
      >
        <div style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          Soroban Course
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ color: 'white', fontSize: 14 }}>
            🔥 {streak} {streak === 1 ? 'day' : 'days'}
          </div>
          <div style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold' }}>
            ⭐ {totalXP} XP
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >

      {/* Level tracks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {Object.entries(levelsByTrack).map(([track, levels]) => {
          const trackKey = track as keyof typeof TRACK_COLORS;
          const colors = TRACK_COLORS[trackKey];

          return (
            <div key={track} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Track header */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: colors.text,
                  textTransform: 'capitalize',
                  padding: '8px 12px',
                  background: colors.bg,
                  borderRadius: 8,
                  border: `2px solid ${colors.border}`,
                }}
              >
                {track} Track ({levels.length} levels)
              </div>

              {/* Level grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                {levels.map((level) => {
                  const progress = getLevelProgress(level.id);
                  const isCompleted = progress.stars > 0;

                  return (
                    <motion.button
                      key={level.id}
                      onClick={() => onSelectLevel(level)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: 12,
                        background: isCompleted
                          ? `linear-gradient(135deg, ${colors.bg} 0%, white 100%)`
                          : '#FFF8E7',
                        border: `3px solid ${isCompleted ? colors.border : '#D4C4A8'}`,
                        borderRadius: 12,
                        cursor: 'pointer',
                        boxShadow: isCompleted
                          ? `0 4px 12px ${colors.border}40`
                          : '0 2px 6px rgba(0,0,0,0.1)',
                        textAlign: 'left',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Level number */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: isCompleted
                              ? `linear-gradient(135deg, ${colors.border} 0%, ${colors.text} 100%)`
                              : '#BDBDBD',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 'bold',
                          }}
                        >
                          {level.id}
                        </div>

                        {/* Stars */}
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3].map((star) => (
                            <span
                              key={star}
                              style={{
                                fontSize: 14,
                                opacity: star <= progress.stars ? 1 : 0.2,
                              }}
                            >
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Level name */}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 'bold',
                          color: '#2D1810',
                        }}
                      >
                        {level.name}
                      </div>

                      {/* Description */}
                      <div
                        style={{
                          fontSize: 11,
                          color: '#5D4632',
                          lineHeight: 1.3,
                        }}
                      >
                        {level.description}
                      </div>

                      {/* Stats */}
                      {progress.attempts > 0 && (
                        <div
                          style={{
                            fontSize: 10,
                            color: '#8B7355',
                            marginTop: 4,
                          }}
                        >
                          Attempts: {progress.attempts} • Best: {Math.round(progress.bestAccuracy)}%
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
