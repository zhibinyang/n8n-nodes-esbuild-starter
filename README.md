# n8n-nodes-esbuild-starter

English | [简体中文](./README_CN.md)

A production-optimized starter template for building [n8n](https://n8n.io) custom nodes using **esbuild** instead of TypeScript compiler (tsc).

> 💡 **Why esbuild?** This starter uses esbuild to dramatically reduce bundle sizes and improve Cloud Run + GCS deployment performance through intelligent bundling and minification.

## ✨ Key Advantages Over Official Starter

This starter template differs from the [official n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter) in several important ways:

### 🚀 **Production-Optimized Builds**
- **Dramatically fewer files**: Bundles reduce hundreds/thousands of dependency files to just a few (~99% reduction in file count)
- **Smaller bundles**: Dependencies are bundled and minified by default (~50-70% size reduction)
- **Reduced memory footprint**: Single bundled files use significantly less memory than many small files
- **Faster builds**: ~100x faster than tsc (milliseconds vs seconds)
- **Production-first**: Minified output by default, development mode opt-in

> 💡 **Key Benefit**: When you include npm dependencies like `google-ads-api`, `axios`, etc., traditional builds create hundreds or thousands of files. esbuild bundles everything into single files, dramatically reducing disk I/O and memory usage - critical for Cloud Run and containerized deployments.

### 📦 **Better for Deployment**
- **Cloud Run + GCS optimized**: Minimal file count for better GCS mounting performance
- **Self-contained**: All dependencies bundled, no external node_modules at runtime
- **Smaller npm packages**: Users download compressed bundles instead of source code

### 🛠️ **Developer Experience**
- **Fast iteration**: Lightning-fast rebuilds during development
- **Watch mode**: Instant rebuilds on file changes
- **Source maps**: Available in development mode for easy debugging

## 🎯 When to Use This Starter

**Use this esbuild starter if:**
- ✅ You need to include external npm dependencies
- ✅ You're deploying to Cloud Run, GCS, or similar platforms
- ✅ Bundle size and deployment performance matter
- ✅ You want faster builds during development

**Use the [official starter](https://github.com/n8n-io/n8n-nodes-starter) if:**
- You're building a node for n8n Cloud (no external dependencies allowed)
- You prefer the standard TypeScript workflow
- You want to use the interactive `@n8n/node-cli` scaffolding

## 🚀 Quick Start

### Create from Template

1. **[Generate a new repository](https://github.com/zhibinyang/n8n-nodes-esbuild-starter/generate)** from this template
2. **Clone your repository**:
   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git
   cd <your-repo>
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start developing**:
   ```bash
   npm run build:watch
   ```

## 📋 What's Included

This starter includes two example nodes:

- **[Example Node](nodes/Example/)** - Simple starter showing basic structure
- **[GitHub Issues Node](nodes/GithubIssues/)** - Production-ready example with:
  - Multiple resources and operations
  - OAuth2 and API token authentication
  - Declarative/low-code style (recommended for HTTP APIs)

> See the [official n8n documentation](https://docs.n8n.io/integrations/creating-nodes/) for complete node development guides.

## 🔨 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | **Production build** (default) - Minified, no sourcemaps |
| `npm run build:dev` | Development build with sourcemaps |
| `npm run build:watch` | Watch mode for development |
| `npm run lint` | Check code for errors |
| `npm run lint:fix` | Auto-fix linting issues |

### Build Output Comparison

```bash
# Production build (default)
npm run build
# → ~10-30% of original size, ready for deployment

# Development build (with sourcemaps)
npm run build:dev  
# → Larger files, easier debugging
```

## 🛠️ Build System Details

### How It Works

This starter uses **esbuild** to:
1. Bundle each `*.node.ts` and `*.credentials.ts` file as separate entry points
2. Include all npm dependencies in the bundle (except `n8n-workflow` and `n8n-core`)
3. Minify and compress for production by default
4. Copy static assets (`.svg`, `.json`) to output directory

### Configuration

The build is configured in [`esbuild.config.mjs`](esbuild.config.mjs):

- **External dependencies**: `n8n-workflow`, `n8n-core`, and Node.js built-ins
- **Bundled dependencies**: Everything else (your npm packages)
- **Production mode** (default): `minify: true`, `sourcemap: false`
- **Development mode** (`--dev` flag): `minify: false`, `sourcemap: true`

### Adding Dependencies

```bash
npm install your-package
```

Dependencies are automatically bundled into your output files. No additional configuration needed!

> ⚠️ **CRITICAL**: Always add your dependencies to `devDependencies`, NOT `dependencies`!
> 
> ```json
> {
>   "devDependencies": {
>     "your-package": "^1.0.0"  // ✅ Correct - only needed at build time
>   },
>   "dependencies": {
>     // ❌ Don't put bundled packages here!
>   }
> }
> ```
> 
> **Why?** When users install your node via n8n:
> - Packages in `dependencies` will be installed by npm (~100MB+ of files)
> - Packages in `devDependencies` will NOT be installed (already bundled in your .js file)
> - This defeats the purpose of bundling if dependencies are installed at runtime!

## 📤 Publishing Your Node

For detailed publishing instructions, please refer to the [official n8n-nodes-starter documentation](https://github.com/n8n-io/n8n-nodes-starter#readme).

**Before publishing, make sure to:**
1. Build with production mode: `rm -rf dist && npm run build`
2. Verify no sourcemap files exist: `ls dist/`
3. Update your `package.json` metadata

## 📚 Learning Resources

- **[n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)** - Official documentation
- **[n8n Built-in Nodes](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes)** - Source code examples
- **[npm Community Nodes](https://www.npmjs.com/search?q=keywords:n8n-community-node-package)** - Browse community packages
- **[esbuild Documentation](https://esbuild.github.io/)** - Learn about the bundler

## 🤝 Comparison with Official Starter

| Feature | This Starter (esbuild) | [Official Starter](https://github.com/n8n-io/n8n-nodes-starter) |
|---------|------------------------|------------------------------------------------------------------|
| **Build tool** | esbuild | TypeScript compiler (tsc) |
| **Build speed** | ~100ms | ~seconds |
| **Bundle size** | Minified by default | Not bundled |
| **Dependencies** | Bundled into output | In node_modules |
| **n8n Cloud** | Not compatible (if using deps) | Compatible |
| **Self-hosted** | Optimized | Standard |
| **CLI scaffolding** | Manual | Interactive (`npm create @n8n/node`) |

## 📄 License

MIT

---

**Based on** [n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter) | **Optimized with** [esbuild](https://esbuild.github.io/)
