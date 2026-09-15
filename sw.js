// 오프라인 캐시. 배포 시 버전이 바뀌면 이전 캐시를 지우고 새 파일을 받습니다.
const VERSION = 'v20260915101031';
const ASSETS = ['./','./index.html','./style.css','./app.js','./vendor/qrcode.min.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/favicon-64.png','./icons/cover.png',
  './content/terms.js','./content/calc.js','./content/law.js','./content/exam.js','./content/glossary.js','./content/guide.js','./content/realestate.js',
  './content/tax.js','./content/labor.js','./content/judicial.js','./content/admin.js','./content/cpa.js','./content/patent.js','./content/appraiser.js','./content/forensic.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// 같은 출처의 GET만: 네트워크 우선, 실패하면 캐시 (외부 API·폰트는 그대로 통과)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
