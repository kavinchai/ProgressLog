import { useCallback, useMemo } from 'react';
import Body from 'react-muscle-highlighter';
import { getGroupForSlug, buildBodyData } from '../utils/muscleMapping';
import './BodyMap.css';

export default function BodyMap({ muscleStats, onSelectMuscle, selectedMuscle }) {
  const handleBodyPartPress = useCallback((part) => {
    const group = getGroupForSlug(part.slug);
    if (!group) return;
    onSelectMuscle(selectedMuscle === group ? null : group);
  }, [selectedMuscle, onSelectMuscle]);

  const bodyData = useMemo(
    () => buildBodyData(muscleStats, selectedMuscle),
    [muscleStats, selectedMuscle]
  );

  return (
    <div className="body-map-container">
      <div className="body-map-view" data-testid="body-map-front">
        <Body
          data={bodyData}
          side="front"
          gender="male"
          onBodyPartPress={handleBodyPartPress}
          defaultFill="#d1d5db"
          border="#9ca3af"
        />
      </div>
      <div className="body-map-view" data-testid="body-map-back">
        <Body
          data={bodyData}
          side="back"
          gender="male"
          onBodyPartPress={handleBodyPartPress}
          defaultFill="#d1d5db"
          border="#9ca3af"
        />
      </div>
    </div>
  );
}
