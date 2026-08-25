import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.d.ts'],
            all: true,
        },
    },
});
