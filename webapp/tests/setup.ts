import {afterEach, vi} from 'vitest';

(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

if (!window.registerPlugin) {
    window.registerPlugin = vi.fn();
}

afterEach(() => {
    document.body.innerHTML = '';
    delete window.WebappUtils;
    vi.unstubAllGlobals();
    vi.useRealTimers();
});
