import esbuild from 'esbuild';
import { glob } from 'glob';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Watch mode enabled via command line flag
const isWatch = process.argv.includes('--watch');

/**
 * ESBuild configuration for n8n custom nodes
 * 
 * Strategy: Bundle each node and credential as a separate entry point
 * - Minimizes file count for optimal GCS mounting performance
 * - Keeps n8n-workflow and n8n-core as external dependencies
 * - Bundles all other dependencies into output files
 */

// Node.js built-in modules to mark as external
const nodeBuiltins = [
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
    'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
    'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
    'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
    'timers', 'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm',
    'wasi', 'worker_threads', 'zlib'
];

// n8n runtime dependencies (must be external)
const n8nExternals = [
    'n8n-workflow',
    'n8n-core',
];

async function build() {
    try {
        console.log('🔍 Scanning for entry points...\n');

        // Find all node and credential TypeScript files
        const nodeFiles = await glob('nodes/**/*.node.ts', { cwd: __dirname });
        const credentialFiles = await glob('credentials/**/*.credentials.ts', { cwd: __dirname });

        const entryPoints = [...nodeFiles, ...credentialFiles];

        if (entryPoints.length === 0) {
            console.error('❌ No entry points found!');
            process.exit(1);
        }

        console.log('📦 Entry points found:');
        entryPoints.forEach(entry => console.log(`   - ${entry}`));
        console.log('');

        // Build configuration
        const buildOptions = {
            entryPoints,
            bundle: true,
            platform: 'node',
            target: 'es2019',
            format: 'cjs',
            outdir: 'dist',
            outbase: '.',
            sourcemap: true,
            minify: false,
            external: [
                ...nodeBuiltins,
                ...n8nExternals,
            ],
            logLevel: 'info',
            metafile: true,
        };

        if (isWatch) {
            console.log('👀 Starting watch mode...\n');
            const context = await esbuild.context(buildOptions);
            await context.watch();
            console.log('✅ Watching for changes...');
        } else {
            console.log('🔨 Building...\n');
            const result = await esbuild.build(buildOptions);

            // Display build summary
            if (result.metafile) {
                const outputs = Object.keys(result.metafile.outputs);
                console.log(`\n✅ Built ${outputs.length} files successfully!\n`);
            }
        }

        // Copy asset files (SVG icons, JSON metadata files)
        console.log('📋 Copying asset files...\n');
        await copyAssets();

        if (!isWatch) {
            console.log('\n✨ Build complete!');
        }

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

/**
 * Copy non-TypeScript assets to dist directory
 * - SVG icon files
 * - JSON metadata files (required by n8n for node detection)
 */
async function copyAssets() {
    // Copy SVG icons
    const svgFiles = await glob('**/*.svg', {
        cwd: __dirname,
        ignore: ['node_modules/**', 'dist/**']
    });

    // Copy JSON files (node metadata, etc.)
    const jsonFiles = await glob('{nodes,credentials}/**/*.json', {
        cwd: __dirname,
        ignore: ['node_modules/**', 'dist/**', 'package.json', 'tsconfig.json']
    });

    const assetFiles = [...svgFiles, ...jsonFiles];

    console.log(`   Found ${assetFiles.length} asset files to copy`);

    for (const file of assetFiles) {
        const srcPath = join(__dirname, file);
        const destPath = join(__dirname, 'dist', file);

        // Create directory if it doesn't exist
        mkdirSync(dirname(destPath), { recursive: true });

        // Copy file
        copyFileSync(srcPath, destPath);
        console.log(`   ✓ ${file}`);
    }
}

// Run the build
build();
