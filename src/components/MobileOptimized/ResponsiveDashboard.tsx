import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { InspectionPhoto } from '../../types';

interface ResponsiveDashboardProps {
  photos: InspectionPhoto[];
  onSelectPhoto: (photo: InspectionPhoto) => void;
  onNavigateToUpload: () => void;
}

export const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  photos,
  onSelectPhoto,
  onNavigateToUpload,
}) => {
  const device = useDeviceDetection();
  const [filteredPhotos, setFilteredPhotos] = useState<InspectionPhoto[]>(photos);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    let result = photos;

    if (searchTerm) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      result = result.filter((p) => p.elementType === selectedCategory);
    }

    setFilteredPhotos(result);
  }, [photos, searchTerm, selectedCategory]);

  // Estadísticas
  const totalPhotos = photos.length;
  const completedPhotos = photos.filter((p) => p.progressPercentage === 100).length;
  const pendingPhotos = photos.filter((p) => p.progressPercentage < 100).length;
  const verifiedPhotos = photos.filter((p) => p.verified).length;

  const stats = [
    { label: 'Total', value: totalPhotos, color: 'bg-blue-100', textColor: 'text-blue-700' },
    { label: 'Completadas', value: completedPhotos, color: 'bg-green-100', textColor: 'text-green-700' },
    { label: 'Pendientes', value: pendingPhotos, color: 'bg-yellow-100', textColor: 'text-yellow-700' },
    { label: 'Verificadas', value: verifiedPhotos, color: 'bg-purple-100', textColor: 'text-purple-700' },
  ];

  return (
    <div className={`space-y-4 ${device.isMobile ? 'pb-24' : ''}`}>
      {/* Stats Grid - Responsive */}
      <div className={`grid gap-3 ${device.isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${stat.color} rounded-lg p-4 text-center`}
          >
            <p className="text-2xl font-bold text-[#071e27]">{stat.value}</p>
            <p className={`text-xs font-medium mt-1 ${stat.textColor}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nombre o ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#004d99] focus:outline-none touch-target"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 momentum-scroll">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all touch-target ${
            selectedCategory === null
              ? 'bg-[#004d99] text-white'
              : 'bg-gray-200 text-[#071e27] hover:bg-gray-300'
          }`}
        >
          Todos
        </button>
        {['camara', 'caja', 'tuberia', 'electrico'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all touch-target ${
              selectedCategory === category
                ? 'bg-[#004d99] text-white'
                : 'bg-gray-200 text-[#071e27] hover:bg-gray-300'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Photos Grid - Responsive */}
      <div className={`grid gap-4 ${device.isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
        {filteredPhotos.length > 0 ? (
          filteredPhotos.map((photo) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={!device.isMobile ? { scale: 1.05 } : {}}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelectPhoto(photo)}
            >
              {/* Image */}
              <div className="relative w-full aspect-square bg-gray-200 overflow-hidden">
                <img
                  src={photo.imageUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Progress Badge */}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-1 font-bold">
                  {photo.progressPercentage}%
                </div>
                {/* Verified Badge */}
                {photo.verified && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs rounded-full px-2 py-1">
                    ✓
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm text-[#071e27] truncate">{photo.name}</h3>
                <p className="text-xs text-gray-500 truncate mt-1">{photo.location}</p>

                {/* Type Badge */}
                <div className="mt-2 flex gap-1 flex-wrap">
                  <span
                    className="text-xs px-2 py-1 rounded-full text-white"
                    style={{
                      backgroundColor: photo.electricalColor || photo.pipeColor || '#004d99',
                    }}
                  >
                    {photo.type.substring(0, 10)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className={`col-span-full text-center py-12 ${
            device.isMobile ? '' : ''
          }`}>
            <p className="text-gray-500 mb-4">No se encontraron inspecciones</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onNavigateToUpload}
              className="px-6 py-3 bg-[#004d99] text-white rounded-lg font-medium active:bg-[#003366] transition-colors touch-target"
            >
              + Agregar Inspección
            </motion.button>
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      {device.isMobile && filteredPhotos.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onNavigateToUpload}
          className="fixed bottom-24 right-4 w-14 h-14 bg-[#004d99] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[#003366] transition-colors touch-target"
        >
          +
        </motion.button>
      )}
    </div>
  );
};
