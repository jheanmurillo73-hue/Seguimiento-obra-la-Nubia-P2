import React from 'react';
import { InspectorProfile, AppModule } from '../types';

interface SideNavBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  inspector: InspectorProfile;
  allowedModules: AppModule[];
  isAdmin: boolean;
  onOpenProfile: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile?: () => void;
  onSignOut: () => void;
  onOpenAuth?: () => void;
  onOpenSupabaseModal?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTab,
  onTabChange,
  inspector,
  allowedModules,
  isAdmin,
  onOpenProfile,
  isMobileOpen,
  onCloseMobile,
  onOpenMobile,
  onSignOut,
  onOpenAuth,
  onOpenSupabaseModal,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Panel Principal',
      icon: 'dashboard',
    },
    {
      id: 'map',
      label: 'Plano de Obra',
      icon: 'map',
    },
    {
      id: 'database',
      label: 'Base de Datos',
      icon: 'database',
    },
    {
      id: 'upload',
      label: 'Subir Foto',
      icon: 'add_a_photo',
    },
    {
      id: 'history',
      label: 'Historial',
      icon: 'history',
    },
    {
      id: 'activity',
      label: 'Actividad de Campo',
      icon: 'receipt_long',
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'settings',
    },
    {
      id: 'admin',
      label: 'Administrar Usuarios',
      icon: 'admin_panel_settings',
      adminOnly: true,
    },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    onCloseMobile();
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between p-4">
      <div>
        {/* Navigation Items */}
        <div className="flex flex-col gap-2">
          {navItems.filter((item) => item.adminOnly ? isAdmin : isAdmin || allowedModules.includes(item.id as AppModule)).map((item) => {
            const isActive = currentTab === item.id || (item.id === 'dashboard' && currentTab === 'detail');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-xl font-['Inter'] font-bold text-[14px] tracking-[0.02em] transition-all text-left ${
                  isActive
                    ? 'bg-[#004d99] text-white shadow-xs'
                    : 'text-[#424752] hover:bg-[#cfe6f2] hover:text-[#004d99]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] shrink-0 ${
                    isActive ? 'fill-icon' : ''
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Device Storage Status Indicator */}
        <div className="mt-6 pt-4 border-t border-[#c2c6d4]">
          <div className="p-3.5 bg-[#f3faff] border border-[#c2c6d4] rounded-xl">
            <div className="flex items-center gap-2 text-[#004d99]">
              <span className="material-symbols-outlined text-[20px]">smartphone</span>
              <span className="material-symbols-outlined text-[20px]">laptop</span>
            </div>
            <div className="font-['Inter'] font-bold text-[13px] text-[#071e27] mt-1.5">
              Memoria del Dispositivo
            </div>
            <div className="text-[12px] text-[#727783] mt-0.5 leading-relaxed">
              Tus fotos y registros se guardan en tu celular o computador.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions: Supabase Auth & Sign Out */}
      <div className="mt-auto pt-4 border-t border-[#c2c6d4] space-y-2">
        {/* Active User Info */}
        <div
          onClick={onOpenProfile}
          className="min-h-[48px] flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#cfe6f2]/50 transition-colors cursor-pointer"
          title="Ver o editar credenciales"
        >
          <img
            src={inspector.avatarUrl}
            alt={inspector.name}
            className="w-9 h-9 rounded-full object-cover border border-[#c2c6d4] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-['Inter'] font-bold text-[13px] text-[#071e27] truncate">
              {inspector.name}
            </div>
            <div className="text-[11px] text-[#424752] truncate">
              {inspector.email}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#004d99]">
              {isAdmin ? 'Administrador' : 'Inspector'}
            </div>
          </div>
        </div>

        {onOpenAuth && (
          <button
            type="button"
            onClick={() => {
              onOpenAuth();
              onCloseMobile();
            }}
            className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-bold text-[13px] text-[#004d99] bg-[#cfe6f2]/50 hover:bg-[#cfe6f2] transition-all text-left"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">lock_person</span>
            <span>Cambiar Cuenta</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-bold text-[13px] text-[#424752] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-all text-left"
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Botón flotante de menú hamburguesa en la esquina superior izquierda en móvil (< 768px) */}
      {!isMobileOpen && onOpenMobile && (
        <button
          type="button"
          onClick={onOpenMobile}
          className="fixed top-3 left-3 z-50 md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#004d99] text-white shadow-lg hover:bg-[#003d7a] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004d99]"
          aria-label="Abrir menú de navegación"
          title="Abrir menú principal"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      )}

      {/* Desktop Fixed SideNav */}
      <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-[#e6f6ff] border-r border-[#c2c6d4] z-40 flex-col">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[82vw] max-w-xs h-full bg-[#e6f6ff] border-r border-[#c2c6d4] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#c2c6d4] bg-[#f3faff]">
              <div>
                <div className="font-['Hanken_Grotesk'] font-black text-[#004d99] text-base leading-tight">
                  TRACKING LA NUBIA
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  PhotoVault Pro Mobile
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-11 h-11 flex items-center justify-center rounded-xl text-[#424752] hover:text-[#ba1a1a] hover:bg-white/80 transition-colors"
                aria-label="Cerrar menú"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
