// KILL ALL SERVICE WORKERS IMMEDIATELY
// This script forcefully removes all service workers

(async function() {
  console.log('🔥 KILLING ALL SERVICE WORKERS...');
  
  if ('serviceWorker' in navigator) {
    // Get all registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Unregister each one
    for(let registration of registrations) {
      try {
        const success = await registration.unregister();
        console.log('❌ Unregistered:', registration.scope, success ? '✓' : '✗');
      } catch(e) {
        console.error('Failed to unregister:', e);
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for(let cacheName of cacheNames) {
        try {
          await caches.delete(cacheName);
          console.log('🗑️ Deleted cache:', cacheName);
        } catch(e) {
          console.error('Failed to delete cache:', e);
        }
      }
    }
    
    console.log('✅ ALL SERVICE WORKERS KILLED!');
    
    // Reload without cache
    setTimeout(() => {
      window.location.reload(true);
    }, 100);
  }
})();