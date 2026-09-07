import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { InspectorProfile, UserAccess } from '../../types';

interface MobileNavBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  inspector: InspectorProfile;
  isAdmin: boolean;
  onOpenProfile: () => void;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

const mobileNavItems = [
  { id: 'dashboard', label: 'Inicio', icon: '📊' },
  { id: 'map', label: 'Mapa', icon: '🗺️' },
  { id: 'upload', label: 'Subir', icon: '📸' },
  { id: 'database', label: 'Datos', icon: '📋' },
  { id: 'activity', label: 'Actividad', icon: '📝' },
];

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentTab,
  onTabChange,
  inspector,
  isAdmin,
  onOpenProfile,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const device = useDeviceDetection();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!device.isMobile) return null;

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 safe-area-inset-top">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-[#071e27] truncate">PhotoVault Pro</h1>
            <p className="text-xs text-gray-500 truncate">{inspector.name}</p>
          </div>
        </div>
        <button
          onClick={onOpenProfile}
          className="touch-target"
        >
          <img
            src={inspector.avatarUrl || 'https://via.placeholder.com/40'}
            alt={inspector.name}
            className="w-10 h-10 rounded-full border-2 border-[#004d99]"
          />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-30 top-16"
            />
            <motion.div
              initial={{ translateX: '-100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 left-0 bottom-0 w-64 bg-white z-40 shadow-lg overflow-y-auto"
            >
              <div className="p-4 space-y-2">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all touch-target ${
                      currentTab === item.id
                        ? 'bg-[#004d99] text-white'
                        : 'text-[#071e27] hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}

                {isAdmin && (
                  <>
                    <div className="my-4 border-t border-gray-200" />
                    <button
                      onClick={() => handleTabClick('admin')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all touch-target ${
                        currentTab === 'admin'
                          ? 'bg-[#c52427] text-white'
                          : 'text-[#071e27] hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">⚙️</span>
                      <span className="font-medium">Admin</span>
                    </button>
                  </>
                )}

                <div className="my-4 border-t border-gray-200" />
                <button
                  onClick={() => {
                    handleTabClick('settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#071e27] hover:bg-gray-100 transition-all touch-target"
                >
                  <span className="text-xl">⚡</span>
                  <span className="font-medium">Configuración</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Tab Bar Style) */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-200 z-30 flex justify-around items-end safe-area-inset-bottom">
        {mobileNavItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`flex-1 flex flex-col items-center justify-end pb-3 pt-2 gap-1 transition-colors touch-target ${
              currentTab === item.id
                ? 'text-[#004d99]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};
