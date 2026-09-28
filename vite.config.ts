import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function dataFilePlugin(): Plugin {
  let root = process.cwd();
  let lastBackupDate = '';

  return {
    name: 'recipe-manager-data-file',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      const dataPath = path.join(root, 'public/data/recipe-manager.json');
      const backupDir = path.join(root, '.data-backups');

      server.middlewares.use('/api/data/status', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ editable: true }));
      });

      server.middlewares.use('/api/data', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method === 'GET') {
          try {
            response.end(await readFile(dataPath, 'utf8'));
          } catch (error) {
            response.statusCode = 500;
            response.end(JSON.stringify({ error: String(error) }));
          }
          return;
        }

        if (request.method !== 'PUT') {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(Buffer.from(chunk));
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!parsed || typeof parsed !== 'object' || !parsed.data) throw new Error('无效的数据文件格式');

          const today = new Date().toISOString().slice(0, 10);
          if (lastBackupDate !== today) {
            await mkdir(backupDir, { recursive: true });
            try {
              await stat(dataPath);
              const backupName = `recipe-manager-${today}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
              await copyFile(dataPath, path.join(backupDir, backupName));
            } catch {
              // 首次创建时没有旧文件可备份。
            }
            lastBackupDate = today;
          }

          parsed.updatedAt = new Date().toISOString();
          const tempPath = `${dataPath}.tmp`;
          await mkdir(path.dirname(dataPath), { recursive: true });
          await writeFile(tempPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
          await rename(tempPath, dataPath);
          response.end(JSON.stringify(parsed));
        } catch (error) {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: String(error) }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), dataFilePlugin()],
  base: './'
});
