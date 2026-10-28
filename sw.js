/* Modo offline do app de abastecimento.
 * - Tela do app: tenta a internet primeiro (pega atualizações) e cai no salvo se estiver sem sinal.
 * - Ícones e bibliotecas: usa o salvo e atualiza em segundo plano.
 * - Servidor (Google Apps Script): sempre pela internet; a fila do app cuida do envio depois. */
const VERSAO = 'abast-1.1.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png'];
const EXTERNOS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== 'abast-ext').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') && !url.hostname.startsWith('fonts')) return; // servidor e Drive: sempre rede
  if (url.hostname.endsWith('googleusercontent.com')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', copia)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  if (EXTERNOS.indexOf(url.hostname) >= 0) {
    e.respondWith(caches.open('abast-ext').then(c => c.match(req).then(salvo => {
      const rede = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => salvo);
      return salvo || rede;
    })));
  }
});
