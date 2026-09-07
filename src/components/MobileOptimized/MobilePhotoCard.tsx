import React from 'react';
import { InspectionPhoto } from '../../types';
import { motion } from 'motion/react';

interface MobilePhotoCardProps {
  photo: InspectionPhoto;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelected?: boolean;
}

export const MobilePhotoCard: React.FC<MobilePhotoCardProps> = ({
  photo,
  onClick,
  onEdit,
  onDelete,
  isSelected = false,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all ${
        isSelected ? 'ring-2 ring-[#004d99]' : ''
      }`}
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-200 overflow-hidden">
        <img
          src={photo.imageUrl}
          alt={photo.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Status Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
          {photo.progressPercentage}%
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-[#071e27] truncate">{photo.name}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{photo.location}</p>

        {/* Status Pills */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: photo.electricalColor || photo.pipeColor || '#dbeafe',
              color: '#000',
            }}
          >
            {photo.type}
          </span>
          {photo.verified && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-200 text-green-800">
              ✓ Verificada
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-t border-gray-100">
        <button
          onClick={onClick}
          className="flex-1 py-2 px-3 bg-[#004d99] text-white rounded-lg text-sm font-medium active:bg-[#003366] transition-colors touch-target"
        >
          Ver
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 bg-gray-100 text-[#071e27] rounded-lg text-sm font-medium active:bg-gray-200 transition-colors touch-target"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium active:bg-red-200 transition-colors touch-target"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
};
