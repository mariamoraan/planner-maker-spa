import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { handleDevApi, isDevApiPath, loadServerEnv } from './server/dev-api';
import { preloadFirebaseAdminFromEnv } from './server/firebase-admin';

export function devApiPlugin(mode: string): Plugin {
  return {
    name: 'planner-dev-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      try {
        preloadFirebaseAdminFromEnv();
        loadServerEnv(env);
        console.log('[dev-api] Uploadthing + Firebase Admin configured');
      } catch (error) {
        console.error('[dev-api] Server env misconfigured:', error);
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        if (!isDevApiPath(pathname)) {
          next();
          return;
        }

        const host = req.headers.host ?? 'localhost:8080';
        const url = new URL(req.url ?? '/', `http://${host}`);

        try {
          await handleDevApi(req, res, url);
        } catch (error) {
          console.error('[dev-api]', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Internal server error',
            })
          );
        }
      });
    },
  };
}
