import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const vercelApiPlugin = () => ({
  name: 'vercel-api-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/')) {
        try {
          const route = req.url.split('?')[0];
          const modulePath = path.resolve(__dirname, `.${route}.ts`);
          const handlerModule = await server.ssrLoadModule(modulePath);
          
          // Polyfill para res.status e res.json (para imitar o Vercel Serverless)
          res.status = (code: number) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };

          return handlerModule.default(req, res);
        } catch (e: any) {
          console.error('Erro na API Local:', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), vercelApiPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
