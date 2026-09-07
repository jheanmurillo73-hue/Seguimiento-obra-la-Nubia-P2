# 📱 Mobile Optimization Guide - PhotoVault Pro

## 🎯 Objetivo

Adaptar PhotoVault Pro para funcionar óptimamente en **Android e iOS**, manteniendo funcionalidad completa de desktop.

---

## 📦 Archivos Agregados

### Hooks (Detección y Gestos)
- **`src/hooks/useDeviceDetection.ts`** - Detecta dispositivo, OS, pantalla (notch, tamaño, orientación)
- **`src/hooks/useTouchGestures.ts`** - Gestos táctiles (swipe, pinch, long press)

### Componentes Base
- **`src/components/MobileOptimized/BottomSheet.tsx`** - Sheet deslizable desde abajo (iOS style)
- **`src/components/MobileOptimized/MobileNavBar.tsx`** - Navegación mobile (hamburger + bottom tab bar)
- **`src/components/MobileOptimized/MobileCamera.tsx`** - Captura nativa de cámara

### Componentes de Negocio
- **`src/components/MobileOptimized/ResponsiveMapView.tsx`** - Mapa con zoom, pan, pinch
- **`src/components/MobileOptimized/ResponsiveDashboard.tsx`** - Dashboard grid responsivo
- **`src/components/MobileOptimized/ResponsiveUpload.tsx`** - Carga con preview y cámara
- **`src/components/MobileOptimized/MobilePhotoDetail.tsx`** - Detalle de foto en bottom sheet
- **`src/components/MobileOptimized/ResponsivePhotoGallery.tsx`** - Galería con swipe

### Componentes de UI
- **`src/components/MobileOptimized/ResponsiveFormComponents.tsx`** - Inputs, buttons adaptados
- **`src/components/MobileOptimized/ResponsiveLayoutComponents.tsx`** - Containers, grids, stacks

### Estilos
- **`src/index.css`** - Tailwind mejorado con:
  - Safe area insets (notch)
  - Touch targets (44px mínimo)
  - Optimizaciones de scroll y animación
  - Viewport responsive
  - Dark mode ready

### PWA
- **`public/manifest.json`** - Configuración web app
- **`public/sw.js`** - Service worker (offline, sync, cache)
- **`public/pwa-register.js`** - Registro y prompt de instalación

---

## 🚀 Integración Paso a Paso

### Paso 1: Actualizar `index.html`

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#004d99" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="PhotoVault" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>PhotoVault Pro</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/pwa-register.js"></script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Paso 2: Reemplazar NavBar en `App.tsx`

```tsx
import { MobileNavBar } from './components/MobileOptimized/MobileNavBar';
import { useDeviceDetection } from './hooks/useDeviceDetection';

export default function App() {
  const device = useDeviceDetection();
  
  return (
    <div>
      {device.isMobile ? (
        <MobileNavBar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          inspector={inspector}
          isAdmin={userAccess.role === 'admin'}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onToggleMobileMenu={onToggleMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
        />
      ) : (
        <TopNavBar {...props} />
      )}
      {/* resto del app */}
    </div>
  );
}
```

### Paso 3: Usar Componentes Responsivos

#### Dashboard
```tsx
import { ResponsiveDashboard } from './components/MobileOptimized/ResponsiveDashboard';

// En App.tsx
{currentTab === 'dashboard' && (
  <ResponsiveDashboard
    photos={photos}
    onSelectPhoto={handleSelectPhoto}
    onNavigateToUpload={() => handleTabChange('upload')}
  />
)}
```

#### Upload
```tsx
import { ResponsiveUpload } from './components/MobileOptimized/ResponsiveUpload';

{currentTab === 'upload' && (
  <ResponsiveUpload
    onUploadSuccess={handleUploadSuccess}
    onCancel={handleBackToGallery}
  />
)}
```

#### Map
```tsx
import { ResponsiveMapView } from './components/MobileOptimized/ResponsiveMapView';

{currentTab === 'map' && (
  <ResponsiveMapView
    photos={photos}
    onSelectPhoto={handleSelectPhoto}
    isAdmin={userAccess.role === 'admin'}
  />
)}
```

### Paso 4: Crear Iconos PWA

Genera con https://www.pwabuilder.com o similar:
- `/icons/icon-192.png` (192x192)
- `/icons/icon-192-maskable.png` (192x192, maskable)
- `/icons/icon-512.png` (512x512)
- `/icons/icon-512-maskable.png` (512x512, maskable)
- `/icons/badge-72.png` (72x72, para notificaciones)

### Paso 5: Configurar Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PhotoVault Pro',
        short_name: 'PhotoVault',
        // ...
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,gif}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 24 * 60 * 60, // 1 día
              },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## 📱 Características Mobile

### ✅ Por Dispositivo

| Feature | iPhone | Android | Tablet |
|---------|--------|---------|--------|
| Safe Area (notch) | ✅ | ✅ | ✅ |
| Camera nativa | ✅ | ✅ | ✅ |
| Gestos (swipe/pinch) | ✅ | ✅ | ✅ |
| PWA install | ✅ | ✅ | ✅ |
| Offline mode | ✅ | ✅ | ✅ |
| Bottom Sheet | ✅ | ✅ | ✅ |
| Touch targets (44px) | ✅ | ✅ | ✅ |

### 🎨 Optimizaciones por Pantalla

**Móvil (< 768px)**
- Navigation: Hamburger + Bottom tab bar
- Layouts: Stack vertical
- Grids: 1-2 columnas
- Modales: Bottom sheets
- Font size: Aumentado (16px mínimo inputs)

**Tablet (768px - 1024px)**
- Navigation: Sidebar + Top bar
- Layouts: Flex/Grid
- Grids: 2-3 columnas
- Modales: Centrados

**Desktop (> 1024px)**
- Navigation: Sidebar completo
- Layouts: Multi-panel
- Grids: 3-4 columnas
- Modales: Centrados con máximo ancho

---

## 🔧 Hooks Disponibles

### `useDeviceDetection()`
```tsx
const device = useDeviceDetection();
// Returns:
// isMobile, isTablet, isDesktop
// isIOS, isAndroid
// screenWidth, screenHeight
// hasNotch, isLandscape

if (device.isMobile) {
  // render mobile version
}
```

### `useIsMobile()`
```tsx
const isMobile = useIsMobile();
// Simple boolean
```

### `useTouchGestures(ref, handlers)`
```tsx
const mapRef = useRef(null);
useTouchGestures(mapRef, {
  onSwipeLeft: () => console.log('Swiped left'),
  onPinch: (scale) => console.log('Pinch scale:', scale),
  onLongPress: () => console.log('Long press'),
});

return <div ref={mapRef}>...</div>;
```

---

## 🖼️ Componentes Responsivos

### `ResponsiveContainer`
```tsx
<ResponsiveContainer maxWidth="lg" padding="md">
  {children}
</ResponsiveContainer>
```

### `ResponsiveGrid`
```tsx
<ResponsiveGrid columns={4} gap="md">
  {items.map(item => <div key={item.id}>{item}</div>)}
</ResponsiveGrid>
```

### `ResponsiveStack`
```tsx
<ResponsiveStack direction="row" gap="lg">
  <div>Item 1</div>
  <div>Item 2</div>
</ResponsiveStack>
```

### `ResponsiveFormField`
```tsx
<ResponsiveFormField
  label="Nombre"
  type="text"
  value={name}
  onChange={setName}
  placeholder="Ingresa nombre"
  required
/>
```

### `ResponsiveButton`
```tsx
<ResponsiveButton
  label="Guardar"
  onClick={handleSave}
  variant="primary"
  size="md"
  fullWidth
/>
```

---

## 📥 Instalación PWA

### iOS (Safari)
1. Abre en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Selecciona "Agregar a pantalla de inicio"

### Android (Chrome)
1. Abre en Chrome
2. Toca el menú ⋮
3. Selecciona "Instalar app"
4. O toca el banner de instalación que aparece automáticamente

### Detectar instalación
```tsx
import { installApp } from '../../public/pwa-register';

const handleInstall = async () => {
  await installApp();
};
```

---

## 🔌 Offline & Sync

El Service Worker maneja:
- **Cache-first**: Assets (JS, CSS, imágenes)
- **Network-first**: Datos Supabase
- **Background sync**: Sincronización pendiente
- **Push notifications**: Notificaciones nativas

### Verificar estado offline
```tsx
const handleUploadWithSync = (photo) => {
  if (navigator.onLine) {
    syncPhotoToSupabase(photo);
  } else {
    saveToLocalStorage(photo);
    toast('Guardado localmente. Se sincronizará cuando haya conexión.');
  }
};
```

---

## 🧪 Testing en Dispositivos Reales

### Local Development
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Expone localmente
ngrok http 3000

# En dispositivo: Abre https://tu-url-ngrok.com
```

### DevTools Móvil
```bash
# Chrome DevTools
- F12 → Ctrl+Shift+M (Toggle device toolbar)
- Simula iPhone 14, Pixel 6, etc.
- Throttling de red
- Emulación de gestos

# Firefox
- Ctrl+Shift+M → Responsive Design Mode
```

### Testing de Gestos
1. **Swipe**: Arrastra dos dedos en la pantalla
2. **Pinch**: Acerca/aleja dos dedos (Shift + scroll en DevTools)
3. **Long press**: Mantén presionado 500ms

---

## ⚡ Performance Tips

### Imagen
```tsx
// Usar lazy loading
<img src="photo" alt="" loading="lazy" />

// Usar responsive images
<picture>
  <source media="(max-width: 600px)" srcSet="photo-small.jpg" />
  <source media="(max-width: 1200px)" srcSet="photo-med.jpg" />
  <img src="photo.jpg" alt="" />
</picture>
```

### Bundle
```tsx
// Code splitting
const MapView = React.lazy(() => import('./MapView'));

// Tree shaking
import { useTouchGestures } from './hooks'; // ✅ Named import
```

### Network
```tsx
// Compression
const compressImage = async (file) => {
  const canvas = await html2canvas(file);
  return canvas.toBlob((blob) => blob, 'image/jpeg', 0.7);
};
```

---

## 🐛 Troubleshooting

### Problema: Inputs se agrandan con focus
**Solución**: Font size > 16px previene zoom automático
```css
input {
  font-size: 16px; /* No less! */
}
```

### Problema: Scroll bounce en iOS
**Solución**: Usa `-webkit-overflow-scrolling`
```css
.scroll-container {
  -webkit-overflow-scrolling: touch;
}
```

### Problema: Safe areas no se respetan
**Solución**: Usa variables CSS
```css
.header {
  padding-top: max(1rem, env(safe-area-inset-top));
}
```

### Problema: Camera permission denied
**Solución**: Solicita permiso explícitamente
```tsx
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
} catch (error) {
  alert('Permiso de cámara requerido');
}
```

---

## 📊 Checklist de Lanzamiento

- [ ] Todos los componentes usan `useDeviceDetection()`
- [ ] Inputs tienen `font-size: 16px`
- [ ] Botones tienen `min-height: 44px`
- [ ] Service worker funciona en DevTools
- [ ] PWA instala en iPhone y Android
- [ ] Offline mode testeo
- [ ] Gestos táctiles funcionan
- [ ] Imágenes cargan rápido
- [ ] Sin overflow horizontal
- [ ] Safe areas respetadas en notch
- [ ] Navegación mobile probada
- [ ] Bundle size < 500KB

---

## 📚 Referencias

- [PWA Basics](https://web.dev/progressive-web-apps/)
- [Mobile Design Patterns](https://material.io/design/platform-guidance/android-bars.html)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ios/)
- [Touch Targets](https://www.nngroup.com/articles/touch-target-size/)
- [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)

---

## 🤝 Soporte

Para dudas sobre la integración, revisa:
1. Console logs (F12 → Console)
2. DevTools mobile emulation
3. Test en dispositivo real
4. Check Service Worker (DevTools → Application → Service Workers)

¡Éxito en el lanzamiento mobile! 🚀
