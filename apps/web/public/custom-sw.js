/**
 * MamaCare — Custom Service Worker extensions.
 * Ce fichier est importe par next-pwa via l'option customWorkerDir.
 * Il ajoute la gestion des push notifications et des rappels locaux.
 */

// Ecouter les push notifications du serveur
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MamaCare AI';
  const options = {
    body: data.body || 'Vous avez une notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.tag || 'mamacare-notification',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification -> ouvrir l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si l'app est deja ouverte, la focus
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      // Sinon ouvrir un nouvel onglet
      return self.clients.openWindow(url);
    }),
  );
});

// Rappel local periodique (simule le rappel 8h/10h sans serveur push)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    const { delayMs, title, body, url } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title || 'MamaCare AI', {
        body: body || 'N\'oubliez pas votre check-up quotidien',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        tag: 'mamacare-reminder',
        data: { url: url || '/questionnaire' },
        vibrate: [200, 100, 200],
      });
    }, delayMs || 0);
  }
});
