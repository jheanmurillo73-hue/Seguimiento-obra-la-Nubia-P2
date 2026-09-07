import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { MobileCamera } from './MobileCamera';

interface ResponsiveUploadProps {
  onUploadSuccess: (imageData: string, metadata?: Record<string, any>) => void;
  onCancel: () => void;
}

export const ResponsiveUpload: React.FC<ResponsiveUploadProps> = ({
  onUploadSuccess,
  onCancel,
}) => {
  const device = useDeviceDetection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress((event.loaded / event.total) * 100);
        }
      };
      reader.onload = () => {
        setPreviewImage(reader.result as string);
        setUploadProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (imageData: string) => {
    setPreviewImage(imageData);
    setShowCamera(false);
  };

  const handleUpload = () => {
    if (previewImage) {
      onUploadSuccess(previewImage);
      setPreviewImage(null);
      setUploadProgress(0);
    }
  };

  if (showCamera) {
    return (
      <MobileCamera
        onCapture={handleCameraCapture}
        onCancel={() => setShowCamera(false)}
        facingMode="environment"
      />
    );
  }

  return (
    <div className={`space-y-4 ${device.isMobile ? 'pb-24' : ''}`}>
      {!previewImage ? (
        <>
          {/* Upload Options */}
          <div className={`grid gap-3 ${device.isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {/* Camera Option */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCamera(true)}
              className="flex flex-col items-center gap-3 p-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl border-2 border-dashed border-[#004d99] hover:border-[#003366] hover:bg-blue-100 transition-all touch-target"
            >
              <span className="text-5xl">📸</span>
              <div className="text-center">
                <p className="font-semibold text-[#071e27]">Tomar Foto</p>
                <p className="text-xs text-gray-600 mt-1">Usar cámara del dispositivo</p>
              </div>
            </motion.button>

            {/* File Upload Option */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-8 bg-gradient-to-br from-green-100 to-green-50 rounded-xl border-2 border-dashed border-[#1b6d24] hover:border-[#0d3a0d] hover:bg-green-100 transition-all touch-target"
            >
              <span className="text-5xl">📁</span>
              <div className="text-center">
                <p className="font-semibold text-[#071e27]">Galería</p>
                <p className="text-xs text-gray-600 mt-1">Seleccionar de galería</p>
              </div>
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border-l-4 border-[#004d99] rounded-lg p-4">
            <p className="text-sm font-semibold text-[#071e27] mb-2">💡 Consejos:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Asegúrate de buena iluminación</li>
              <li>• Evita reflejos en la pantalla</li>
              <li>• Captura ángulos diferentes del elemento</li>
              <li>• Máx. 5MB por imagen</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* Image Preview */}
          <div className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-[#071e27]">Subiendo...</p>
                <p className="text-sm font-bold text-[#004d99]">{Math.round(uploadProgress)}%</p>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#004d99]"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Metadata Form */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre de la inspección"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#004d99] focus:outline-none touch-target"
            />
            <textarea
              placeholder="Notas o descripción (opcional)"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#004d99] focus:outline-none resize-none touch-target"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPreviewImage(null)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-[#071e27] font-semibold rounded-lg hover:bg-gray-50 transition-all touch-target"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleUpload}
              className="flex-1 px-4 py-3 bg-[#004d99] text-white font-semibold rounded-lg hover:bg-[#003366] transition-all touch-target"
            >
              Subir
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};
