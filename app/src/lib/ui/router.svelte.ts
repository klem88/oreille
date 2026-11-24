/** Routeur minimal par hash : `#/`, `#/palier/<ID>`, `#/serie` ; `#dev-audio` garde la page de test audio (R9). */
export type Route =
  | { name: 'home' }
  | { name: 'palier'; id: string }
  | { name: 'serie' }
  | { name: 'dev-audio' };

export function parseRoute(hash: string): Route {
  if (hash === '#dev-audio') return { name: 'dev-audio' };
  const m = /^#\/palier\/([A-I])$/.exec(hash);
  if (m) return { name: 'palier', id: m[1] };
  if (hash === '#/serie') return { name: 'serie' };
  return { name: 'home' };
}

class Router {
  route = $state<Route>(parseRoute(location.hash));

  constructor() {
    window.addEventListener('hashchange', () => {
      this.route = parseRoute(location.hash);
      window.scrollTo(0, 0);
    });
  }
}

export const router = new Router();

export function go(path: '#/' | '#/serie' | `#/palier/${string}`): void {
  if (location.hash === path) router.route = parseRoute(path);
  else location.hash = path;
}
