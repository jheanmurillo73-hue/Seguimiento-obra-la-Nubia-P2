import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { InspectionPhoto } from '../../types';
import { BottomSheet } from './BottomSheet';

interface MobilePhotoDetailProps {
  photo: InspectionPhoto;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MobilePhotoDetail: React.FC<MobilePhotoDetailProps> = ({
  photo,
  onClose,
  onEdit,
  onDelete,
}) => {
  const device = useDeviceDetection();
  const [showFullImage, setShowFullImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const imageUrls = photo.imageUrls && photo.imageUrls.length > 0 ? photo.imageUrls : [photo.imageUrl];

  if (!device.isMobile) return null;

  return (
    <>
      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {showFullImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center"
            onClick={() => setShowFullImage(false)}
          >
            {/* Image */}
            <img
              src={imageUrls[currentImageIndex]}
              alt={photo.name}
              className="w-full h-full object-contain"
            />

            {/* Image Counter */}
            {imageUrls.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {imageUrls.length}
              </div>
            )}

            {/* Navigation */}
            <div className="absolute inset-y-0 left-0 right-0 flex justify-between items-center px-4 pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
                }}
                className="pointer-events-auto w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors touch-target"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
                }}
                className="pointer-events-auto w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors touch-target"
              >
                ›
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 left-4 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors touch-target"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet Detail View */}
      <BottomSheet
        isOpen={!showFullImage}
        onClose={onClose}
        title={photo.name}
        height="full"
        isDismissible={true}
      >
        <div className="space-y-6 pb-8">
          {/* Main Image */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setShowFullImage(true)}
            className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer shadow-lg"
          >
            <img
              src={imageUrls[currentImageIndex]}
              alt={photo.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
              <span className="text-white text-3xl opacity-0 hover:opacity-100 transition-opacity">🔍</span>
            </div>
          </motion.div>

          {/* Thumbnail Carousel */}
          {imageUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 momentum-scroll">
              {imageUrls.map((url, index) => (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all touch-target ${
                    currentImageIndex === index ? 'border-[#004d99]' : 'border-gray-300'
                  }`}
                >
                  <img src={url} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Info Section */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-[#004d99]">
              <h3 className="font-bold text-[#071e27] mb-3">📋 Información</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ubicación:</span>
                  <span className="font-semibold text-[#071e27]">{photo.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-semibold text-[#071e27]">{photo.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-semibold text-[#071e27]">{photo.executionStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Progreso:</span>
                  <span className="font-semibold text-[#004d99]">{photo.progressPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[#071e27]">Progreso de Obra</span>
                <span className="text-sm font-bold text-[#004d99]">{photo.progressPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#004d99] to-[#1565c0]"
                  initial={{ width: 0 }}
                  animate={{ width: `${photo.progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Metadata */}
            {photo.fieldNotes && (
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
                <h4 className="font-semibold text-[#071e27] mb-2 text-sm">📝 Notas</h4>
                <p className="text-sm text-gray-700 line-clamp-3">{photo.fieldNotes}</p>
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {photo.verified && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
                  ✓ Verificada
                </span>
              )}
              {photo.requiresImmediateAction && (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
                  ⚠️ Acción urgente
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                backgroundColor: photo.electricalColor || photo.pipeColor || '#dbeafe',
              }}>
                {photo.category || 'Inspección'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onEdit}
              className="flex-1 px-4 py-3 bg-[#004d99] text-white font-semibold rounded-lg active:bg-[#003366] transition-colors touch-target"
            >
              ✏️ Editar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowActions(!showActions)}
              className="px-4 py-3 bg-gray-200 text-[#071e27] font-semibold rounded-lg active:bg-gray-300 transition-colors touch-target"
            >
              ⋯
            </motion.button>
          </div>

          {/* Additional Actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-3"
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onDelete}
                  className="flex-1 px-4 py-3 bg-red-100 text-red-600 font-semibold rounded-lg active:bg-red-200 transition-colors touch-target"
                >
                  🗑️ Eliminar
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg active:bg-gray-200 transition-colors touch-target"
                >
                  Cerrar
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BottomSheet>
    </>
  );
};
