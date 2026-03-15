import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json';
// https://vite.dev/config/
export default defineConfig(function (_a) {
    var command = _a.command, mode = _a.mode;
    return ({
        base: mode === 'production' ? '/made4jam/' : '/',
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version)
        },
        plugins: [
            react(),
            tailwindcss()
        ],
        server: {
            port: 3000,
            proxy: {
                '/api': {
                    target: 'http://localhost:8080/api',
                    changeOrigin: true,
                    rewrite: function (path) { return path.replace(/^\/api/, ''); }
                }
            }
        }
    });
});
