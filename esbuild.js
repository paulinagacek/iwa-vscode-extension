/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs/promises");


const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: "esbuild-problem-matcher",

    setup(build) {
        build.onStart(() => {
            console.log("[watch] build started");
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                if (location) {
                    console.error(`    ${location.file}:${location.line}:${location.column}:`);
                }
            });
            console.log("[watch] build finished");
        });
    },
};


/**
 * @type {import('esbuild').Plugin}
 */
const copyStaticAssetsPlugin = {
    name: "copy-static-assets",
    setup(build) {
        build.onEnd(async (result) => {
            if (result.errors.length > 0) {
                console.log("Build failed, skipping asset copy.");
                return;
            }

            const inDir = path.resolve(__dirname, "src", "assets");
            const outDir = path.resolve(__dirname, "dist", "assets");

            try {
                await fs.cp(inDir, outDir, { recursive: true, force: true });
                console.log("[copy] Copied assets from src/assets to dist/assets");
            } catch (err) {
                console.error("✘ [ERROR] Failed to copy assets:", err);
            }
        });
    },
};

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ["src/extension.ts"],
        bundle: true,
        format: "cjs",
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: "node",
        outdir: "dist/",
        external: ["vscode"],
        logLevel: "silent",
        plugins: [esbuildProblemMatcherPlugin, copyStaticAssetsPlugin],
    });
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
