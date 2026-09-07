import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

interface ResponsivePhotoGalleryProps {
  photos: string[];
  onSelectPhoto: (index: number) => void;
  onDeletePhoto: (index: number) => void;
  currentIndex?: number;
}

export const ResponsivePhotoGallery: React.FC<ResponsivePhotoGalleryProps> = ({
  photos,
  onSelectPhoto,
  onDeletePhoto,
  currentIndex = 0,
}) => {
  const device = useDeviceDetection();
  const [dragStart, setDragStart] = useState(0);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(currentIndex);

  const handlePrev = useCallback(() => {
    setCurrentDisplayIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentDisplayIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  const handleDragStart = (e: React.DragEvent) => {
    setDragStart(e.clientX);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const diff = dragStart - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  if (photos.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Main Image Viewer */}
      <div
        className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-lg cursor-grab active:cursor-grabbing"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        draggable
      >
        <motion.img
          key={currentDisplayIndex}
          src={photos[currentDisplayIndex]}
          alt={`Photo ${currentDisplayIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-full object-cover"
        />

        {/* Image Counter Badge */}
        <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold">
          {currentDisplayIndex + 1} / {photos.length}
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-[#071e27] rounded-full flex items-center justify-center shadow-lg transition-all touch-target"
            >
              ‹
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-[#071e27] rounded-full flex items-center justify-center shadow-lg transition-all touch-target"
            >
              ›
            </motion.button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 momentum-scroll">
          {photos.map((photo, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentDisplayIndex(index)}
              className={`flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-3 transition-all touch-target ${
                currentDisplayIndex === index ? 'border-[#004d99] shadow-lg' : 'border-gray-300 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Mobile Action Buttons */}
      {device.isMobile && (
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectPhoto(currentDisplayIndex)}
            className="flex-1 px-4 py-2 bg-[#004d99] text-white rounded-lg text-sm font-semibold active:bg-[#003366] transition-colors touch-target"
          >
            Ver detalles
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onDeletePhoto(currentDisplayIndex)}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold active:bg-red-200 transition-colors touch-target"
          >
            🗑️
          </motion.button>
        </div>
      )}
    </div>
  );
};
