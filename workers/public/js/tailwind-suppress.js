const originalWarn = console.warn;
console.warn = function(...args) {
    if (args[0]?.includes?.('cdn.tailwindcss.com')) return;
    originalWarn.apply(console, args);
};
