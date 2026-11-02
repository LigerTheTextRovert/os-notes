import { defineConfig } from 'vite';
import { buildNotes } from './scripts/build-notes.mjs';

function vulkonNotesPlugin() {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    name: 'vulkon-notes',
    async config() {
      const result = await buildNotes();
      return {
        build: {
          rollupOptions: {
            input: result.inputs,
          },
        },
      };
    },
    configureServer(server: { watcher: any; ws: { send: (p: unknown) => void } }) {
      const rebuild = async (file: string) => {
        if (!/[\\/](src[\\/](notes|templates))[\\/]/.test(file)) return;
        clearTimeout(timer);
        timer = setTimeout(async () => {
          await buildNotes();
          server.ws.send({ type: 'full-reload' });
        }, 80);
      };
      server.watcher.on('add', rebuild);
      server.watcher.on('change', rebuild);
      server.watcher.on('unlink', rebuild);
    },
  };
}

export default defineConfig({
  plugins: [vulkonNotesPlugin()],
});
