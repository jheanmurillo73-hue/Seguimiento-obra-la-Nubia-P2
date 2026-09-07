import React from 'react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

const paddingClasses = {
  xs: 'px-2 py-2',
  sm: 'px-3 py-3',
  md: 'px-4 py-4',
  lg: 'px-6 py-6',
};

/**
 * Container que se adapta automáticamente al tamaño de pantalla
 * En móvil: padding y máximos ajustados
 * En desktop: mayor espacio
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'full',
  padding = 'md',
  className = '',
}) => {
  const device = useDeviceDetection();

  const mobilePadding = device.isMobile ? 'px-3 py-3' : paddingClasses[padding];

  return (
    <div
      className={`${
        maxWidthClasses[maxWidth]
      } mx-auto ${mobilePadding} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Grid responsivo que se ajusta automáticamente
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const gapClasses = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 3,
  gap = 'md',
  className = '',
}) => {
  const device = useDeviceDetection();

  let gridCols = 'grid-cols-1';
  if (!device.isMobile && !device.isTablet) {
    gridCols = `grid-cols-${columns}`;
  } else if (device.isTablet) {
    gridCols = 'grid-cols-2';
  }

  return (
    <div className={`grid ${gridCols} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Stack vertical/horizontal responsivo
 */
interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = 'column',
  gap = 'md',
  className = '',
}) => {
  const device = useDeviceDetection();

  // En móvil siempre column, en desktop respetar direction
  const finalDirection = device.isMobile ? 'column' : direction;
  const flexDirection = finalDirection === 'row' ? 'flex-row' : 'flex-col';

  return (
    <div
      className={`flex ${flexDirection} ${gapClasses[gap]} ${className}`}
    >
      {children}
    </div>
  );
};
