import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { InspectionPhoto } from '../../types';

interface ResponsiveMapViewProps {
  photos: InspectionPhoto[];
  onSelectPhoto: (photo: InspectionPhoto) => void;
  isAdmin: boolean;
}

export const ResponsiveMapView: React.FC<ResponsiveMapViewProps> = ({
  photos,
  onSelectPhoto,
  isAdmin,
}) => {
  const device = useDeviceDetection();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showZoomControls, setShowZoomControls] = useState(true);

  // Touch gestures for mobile
  useTouchGestures(containerRef, {
    onPinch: (scale) => {
      setZoom((prev) => Math.max(0.5, Math.min(5, prev * scale)));
    },
    onSwipeLeft: () => {
      setPanX((prev) => prev - 50);
    },
    onSwipeRight: () => {
      setPanX((prev) => prev + 50);
    },
    onSwipeUp: () => {
      setPanY((prev) => prev - 50);
    },
    onSwipeDown: () => {
      setPanY((prev) => prev + 50);
    },
  });

  const handleZoomIn = () => setZoom((prev) => Math.min(5, prev + 0.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, prev - 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-gradient-to-br from-blue-50 to-blue-100 ${
        device.isMobile ? 'h-[calc(100vh-180px)]' : 'h-full'
      } overflow-hidden`}
    >
      {/* Map SVG */}
      <svg
        className="w-full h-full cursor-move momentum-scroll"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center',
          transition: 'transform 0.2s ease-out',
        }}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="2000" height="1600" fill="url(#grid)" />

        {/* Photo elements */}
        {photos.map((photo) => (
          <g key={photo.id} className="cursor-pointer">
            {/* Element marker */}
            {photo.planX !== undefined && photo.planY !== undefined && (
              <motion.circle
                cx={photo.planX * 20}
                cy={photo.planY * 20}
                r="20"
                fill={photo.electricalColor || photo.pipeColor || '#004d99'}
                stroke="white"
                strokeWidth="2"
                opacity={0.8}
                whileHover={{ r: 25 }}
                onClick={() => {
                  onSelectPhoto(photo);
                  setSelectedElementId(photo.id);
                }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Mobile Zoom Controls */}
      {device.isMobile && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomIn}
            className="w-12 h-12 rounded-full bg-white shadow-lg border-2 border-[#004d99] text-[#004d99] font-bold flex items-center justify-center active:bg-gray-100 touch-target"
          >
            +
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomOut}
            className="w-12 h-12 rounded-full bg-white shadow-lg border-2 border-[#004d99] text-[#004d99] font-bold flex items-center justify-center active:bg-gray-100 touch-target"
          >
            −
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleResetView}
            className="w-12 h-12 rounded-full bg-[#004d99] shadow-lg text-white flex items-center justify-center active:bg-[#003366] touch-target"
          >
            🎯
          </motion.button>
        </div>
      )}

      {/* Desktop Zoom Controls */}
      {!device.isMobile && (
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handleZoomIn}
            className="px-4 py-2 bg-white rounded-lg shadow-md border-2 border-[#004d99] hover:bg-gray-50 transition-colors"
          >
            Zoom In
          </button>
          <button
            onClick={handleZoomOut}
            className="px-4 py-2 bg-white rounded-lg shadow-md border-2 border-[#004d99] hover:bg-gray-50 transition-colors"
          >
            Zoom Out
          </button>
          <button
            onClick={handleResetView}
            className="px-4 py-2 bg-[#004d99] text-white rounded-lg shadow-md hover:bg-[#003366] transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Info Panel */}
      {selectedElementId && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className={`absolute bottom-0 left-0 right-0 bg-white border-t-2 border-[#004d99] shadow-2xl rounded-t-2xl p-4 ${
            device.isMobile ? 'max-h-48 overflow-y-auto' : 'max-w-md'
          }`}
        >
          {photos
            .filter((p) => p.id === selectedElementId)
            .map((photo) => (
              <div key={photo.id}>
                <h3 className="font-bold text-[#071e27]">{photo.name}</h3>
                <p className="text-sm text-gray-600 mt-2">{photo.location}</p>
                <p className="text-sm text-gray-500 mt-1">Progreso: {photo.progressPercentage}%</p>
              </div>
            ))}
        </motion.div>
      )}
    </div>
  );
};
