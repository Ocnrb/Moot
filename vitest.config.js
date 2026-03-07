import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environment para simular browser
    environment: 'jsdom',
    
    // Padrões de ficheiros de teste
    include: ['src/**/*.{test,spec}.js', 'tests/**/*.{test,spec}.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/js/**/*.js'],
      exclude: [
        'src/js/workers/**',
        'src/js/app.js', // Entry point
        '**/*.bundle.js'
      ],
      thresholds: {
        // Começar com thresholds baixos, aumentar gradualmente
        statements: 2,
        branches: 2,
        functions: 2,
        lines: 2
      }
    },
    
    // Global setup
    globals: true,
    
    // Setup file
    setupFiles: ['./tests/setup.js'],
    
    // Timeout para testes async
    testTimeout: 10000,
    
    // Isolamento entre testes
    isolate: true,
    
    // Pool de workers
    pool: 'forks',
    
    // Reporter
    reporters: ['verbose']
  }
});
