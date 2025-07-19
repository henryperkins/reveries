import React from 'react';
import { ProgressMeter, ProgressMeterProps } from './ProgressMeter';
import { type HostParadigm } from '@/theme';

export interface ProgressMeterGroupProps {
  meters: Array<{
    label: string;
    value: number;
    color?: string;
    paradigm?: HostParadigm;
    id?: string;
  }>;
  variant?: ProgressMeterProps['variant'];
  size?: ProgressMeterProps['size'];
  showValues?: boolean;
  showLabels?: boolean;
  layout?: 'vertical' | 'horizontal';
  className?: string;
  labelWidth?: string;
  animate?: boolean;
}

export const ProgressMeterGroup: React.FC<ProgressMeterGroupProps> = ({
  meters,
  variant = 'default',
  size = 'sm',
  showValues = true,
  showLabels = true,
  layout = 'vertical',
  className = '',
  labelWidth = 'w-20',
  animate = true,
}) => {
  if (layout === 'horizontal') {
    return (
      <div className={`flex flex-wrap gap-4 ${className}`}>
        {meters.map((meter, index) => (
          <div key={meter.id || index} className="flex-1 min-w-[200px]">
            <ProgressMeter
              value={meter.value}
              label={showLabels ? meter.label : undefined}
              variant={variant}
              paradigm={meter.paradigm}
              colorClass={meter.color}
              size={size}
              showPercentage={showValues}
              animate={animate}
            />
          </div>
        ))}
      </div>
    );
  }

  // Vertical layout (default)
  return (
    <div className={`space-y-2 ${className}`}>
      {meters.map((meter, index) => (
        <div key={meter.id || index} className="flex items-center gap-2">
          {showLabels && (
            <span className={`capitalize ${labelWidth} text-sm`}>
              {meter.label}:
            </span>
          )}
          <div className="flex-1">
            <ProgressMeter
              value={meter.value}
              variant={variant}
              paradigm={meter.paradigm}
              colorClass={meter.color}
              size={size}
              showPercentage={false}
              animate={animate}
            />
          </div>
          {showValues && (
            <span className="text-sm min-w-[3rem] text-right">
              {Math.round(meter.value)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
};