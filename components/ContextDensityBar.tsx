import React from 'react';
import { HouseParadigm } from '../types';

interface ContextDensityBarProps {
  densities: Record<HouseParadigm, number>;
  dominantHouse: HouseParadigm;
  phase: string;
  showLabels?: boolean;
}

const houseColors: Record<HouseParadigm, string> = {
  gryffindor: '#740001',
  hufflepuff: '#FFD800',
  ravenclaw: '#0E1A40',
  slytherin: '#1A472A'
};

const houseLabels: Record<HouseParadigm, string> = {
  gryffindor: 'G',
  hufflepuff: 'H',
  ravenclaw: 'R',
  slytherin: 'S'
};

export const ContextDensityBar: React.FC<ContextDensityBarProps> = ({
  densities,
  dominantHouse,
  phase,
  showLabels = false
}) => {
  const houses: HouseParadigm[] = ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'];
  const total = Object.values(densities).reduce((sum, d) => sum + d, 0);

  return (
    <div className="w-full">
      <div className="flex h-3 rounded overflow-hidden shadow-inner bg-gray-200">
        {houses.map((house) => {
          const percentage = (densities[house] / total) * 100;
          const isDominant = house === dominantHouse;

          return (
            <div
              key={house}
              className={`
                relative transition-all duration-300
                ${isDominant ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
              `}
              style={{
                width: `${percentage}%`,
                backgroundColor: houseColors[house],
                opacity: isDominant ? 1 : 0.7
              }}
              title={`${house}: ${densities[house]}%`}
            >
              {showLabels && percentage > 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                  {houseLabels[house]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Phase: {phase.replace(/_/g, ' ')} • Dominant: {dominantHouse}
      </div>
    </div>
  );
};
