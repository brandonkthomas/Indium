import { build } from 'esbuild';

const mode = process.argv[2] || 'all';
const appVersion = process.env.INDIUM_APP_VERSION || 'dev';

const jsEntries = {
    'build/indium.js': 'ts/indium.ts',
    'build/components/dialogs.js': 'ts/entries/components/dialogs.ts',
    'build/components/glassSurface.js': 'ts/entries/components/glassSurface.ts',
    'build/components/infiniteScroll.js': 'ts/entries/components/infiniteScroll.ts',
    'build/components/sidebar.js': 'ts/entries/components/sidebar.ts',
    'build/components/gradNoiseCanvas.js': 'ts/entries/components/gradNoiseCanvas.ts',
    'build/components/navbar.js': 'ts/entries/components/navbar.ts'
};

const cssEntries = {
    'build/indium.css': 'css/indium.css',
    'build/components/dialogs.css': 'css/entries/components/dialogs.css',
    'build/components/glassSurface.css': 'css/entries/components/glassSurface.css',
    'build/components/infiniteScroll.css': 'css/entries/components/infiniteScroll.css',
    'build/components/sidebar.css': 'css/entries/components/sidebar.css',
    'build/components/cards.css': 'css/entries/components/cards.css',
    'build/components/navbar.css': 'css/entries/components/navbar.css',
    'build/components/shell.css': 'css/entries/components/shell.css'
};

async function buildJs() {
    await Promise.all(Object.entries(jsEntries).map(([outfile, entry]) => (
        build({
            entryPoints: [entry],
            bundle: true,
            format: 'esm',
            target: 'es2020',
            outfile,
            define: {
                __INDIUM_APP_VERSION__: JSON.stringify(appVersion)
            }
        })
    )));
}

async function buildCss() {
    await Promise.all(Object.entries(cssEntries).map(([outfile, entry]) => (
        build({
            entryPoints: [entry],
            bundle: true,
            outfile
        })
    )));
}

async function run() {
    if (mode === 'js') {
        await buildJs();
        return;
    }
    if (mode === 'css') {
        await buildCss();
        return;
    }
    await buildJs();
    await buildCss();
}

run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
});
