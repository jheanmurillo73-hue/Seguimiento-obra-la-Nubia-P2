import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface MobileCameraProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  facingMode?: 'user' | 'environment';
}

export const MobileCamera: React.FC<MobileCameraProps> = ({
  onCapture,
  onCancel,
  facingMode = 'environment',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(
    facingMode
  );

  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: currentFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
        onCancel();
      }
    };

    initializeCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [currentFacingMode, onCancel]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
    onCapture(imageData);
  };

  const toggleCamera = async () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCurrentFacingMode(currentFacingMode === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Camera View */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-4">
        {/* Cancel */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCancel}
          className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg touch-target"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        {/* Capture */}
        {isCameraReady && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg touch-target"
          />
        )}

        {/* Toggle Camera */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleCamera}
          className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg touch-target"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 12m0 0l-4 4m4-4l4 4" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
};
