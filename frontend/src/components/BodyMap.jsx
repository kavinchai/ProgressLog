import { useRef, useEffect, useCallback } from 'react';
import { BodyChart, ViewSide } from 'body-muscles';
import { getGroupForMuscleId, buildBodyState } from '../utils/muscleMapping';
import './BodyMap.css';

export default function BodyMap({ muscleStats, onSelectMuscle, selectedMuscle }) {
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const frontChartRef = useRef(null);
  const backChartRef = useRef(null);

  const handleMuscleClick = useCallback((muscleId) => {
    const group = getGroupForMuscleId(muscleId);
    if (!group) return;
    onSelectMuscle(selectedMuscle === group ? null : group);
  }, [selectedMuscle, onSelectMuscle]);

  useEffect(() => {
    const bodyState = buildBodyState(muscleStats, selectedMuscle);

    if (!frontChartRef.current && frontRef.current) {
      frontChartRef.current = new BodyChart(frontRef.current, {
        view: ViewSide.FRONT,
        bodyState,
        onMuscleClick: (id) => handleMuscleClick(id),
        showViewLabel: true,
        enableTransitions: true,
      });
    }

    if (!backChartRef.current && backRef.current) {
      backChartRef.current = new BodyChart(backRef.current, {
        view: ViewSide.BACK,
        bodyState,
        onMuscleClick: (id) => handleMuscleClick(id),
        showViewLabel: true,
        enableTransitions: true,
      });
    }

    return () => {
      frontChartRef.current?.destroy();
      backChartRef.current?.destroy();
      frontChartRef.current = null;
      backChartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const bodyState = buildBodyState(muscleStats, selectedMuscle);
    frontChartRef.current?.update({
      bodyState,
      onMuscleClick: (id) => handleMuscleClick(id),
    });
    backChartRef.current?.update({
      bodyState,
      onMuscleClick: (id) => handleMuscleClick(id),
    });
  }, [muscleStats, selectedMuscle, handleMuscleClick]);

  return (
    <div className="body-map-container">
      <div className="body-map-view" ref={frontRef} data-testid="body-map-front" />
      <div className="body-map-view" ref={backRef} data-testid="body-map-back" />
    </div>
  );
}
