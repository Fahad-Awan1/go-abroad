import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { renderBlock } from './src/js/data/render.js';

const pages = ['index', 'services', 'destinations', 'study-abroad', 'about', 'contact', 'faq', '404'];

/**
 * Build-time HTML includes so every page ships as complete static HTML.
 *   <!-- @include header -->        -> src/partials/header.html
 *   <!-- @render destinations-grid --> -> renderBlock('destinations-grid')
 * The active nav link is marked from <body data-page="...">.
 */
function htmlPartials() {
  const partial = (name) => readFileSync(resolve(import.meta.dirname, `src/partials/${name}.html`), 'utf8');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // partials may contain further includes (e.g. logo inside header)
        for (let i = 0; i < 3; i++) {
          html = html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, n) => partial(n));
        }
        html = html.replace(/<!--\s*@render\s+([\w-]+)\s*-->/g, (_, n) => renderBlock(n));
        const page = (html.match(/<body[^>]*data-page="([\w-]+)"/) || [])[1];
        if (page) {
          html = html.replace(new RegExp(`data-nav="${page}"`, 'g'), `data-nav="${page}" aria-current="page"`);
        }
        return html;
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('partials') || file.includes(`data${'/'}`) || file.includes('data\\')) {
        server.ws.send({ type: 'full-reload' });
      }
    },
  };
}

export default defineConfig({
  plugins: [htmlPartials()],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 700,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
});
