// sw.js - Service Worker para Push Notifications
// ================================================
// Este ficheiro TEM de estar na raiz do site
// para ter scope sobre todas as páginas.
// ================================================

const SW_VERSION = '1.0.0';

// ================================================
// INSTALAÇÃO
// ================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Instalado v' + SW_VERSION);
    // NÃO usar skipWaiting() - deixar o browser gerir a transição
    // para evitar resets inesperados da app
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activado');
    // NÃO usar clients.claim() - evita refresh forçado
    // A próxima navegação/refresh vai usar o novo SW naturalmente
});

// ================================================
// PUSH NOTIFICATION
// ================================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push recebido');
    
    let data = {};
    
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.warn('[SW] Push data não é JSON:', e);
    }
    
    // O relay envia { type: 'wake', timestamp: ... }
    // Não revela quem enviou nem o conteúdo (privacidade máxima)
    
    const options = {
        body: 'You have new messages',
        icon: '/favicon/web-app-manifest-192x192.png',
        badge: '/favicon/favicon-96x96.png',
        tag: 'pombo-notification', // Agrupa notificações
        renotify: true, // Vibra mesmo que já exista uma com esta tag
        requireInteraction: false, // Não requer interação do user
        silent: false,
        vibrate: [200, 100, 200],
        data: {
            url: self.registration.scope,
            timestamp: data.timestamp || Date.now()
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'dismiss',
                title: 'Ignorar'
            }
        ]
    };
    
    event.waitUntil(
        // Primeiro, verificar se já temos uma janela aberta
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // Se há uma janela focada, não mostrar notificação
                const focusedClient = clients.find(c => c.focused);
                if (focusedClient) {
                    console.log('[SW] App já está focada, ignorando notificação visual');
                    // Mas ainda assim notificar a app
                    focusedClient.postMessage({
                        type: 'PUSH_RECEIVED',
                        timestamp: data.timestamp
                    });
                    return;
                }
                
                // Mostrar notificação
                return self.registration.showNotification('Pombo', options);
            })
    );
});

// ================================================
// CLICK NA NOTIFICAÇÃO
// ================================================

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada:', event.action);
    
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    // Abrir ou focar a app
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // Se já temos uma janela, focar
                if (clients.length > 0) {
                    const client = clients[0];
                    client.focus();
                    // Notificar que foi clicada
                    client.postMessage({
                        type: 'NOTIFICATION_CLICKED'
                    });
                    return;
                }
                
                // Senão, abrir nova janela
                return self.clients.openWindow(event.notification.data?.url || '/');
            })
    );
});

// ================================================
// FECHAR NOTIFICAÇÃO
// ================================================

self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notificação fechada');
});

// ================================================
// MENSAGENS DO CLIENTE
// ================================================

self.addEventListener('message', (event) => {
    console.log('[SW] Mensagem recebida:', event.data);
    
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
