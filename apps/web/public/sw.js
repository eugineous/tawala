// Unregister all service workers and clear all caches
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  self.clients.claim()
  // Clear every cache
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
})
self.addEventListener('fetch', () => {})
