const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');
const packageJson = require(path.join(projectRoot, 'package.json'));

/**
 * Zips a directory and saves it to the specified output path.
 * @param {string} sourceDir The directory to zip.
 * @param {string} outPath The path for the output zip file.
 * @returns {Promise<void>}
 */
function zipDirectory(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .glob('**/*', {
                cwd: sourceDir,
                ignore: ['**/.*', '**/__MACOSX'], // Exclude dotfiles and macOS metadata
                dot: true // Important to include dotfiles in the glob so they can be ignored
            })
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
}

async function build(browser) {
    const browserDistDir = path.join(distDir, browser);

    try {
        // Clean and create destination directory
        await fs.remove(browserDistDir);
        await fs.ensureDir(browserDistDir);

        // Copy all files from src to the browser-specific dist folder
        await fs.copy(srcDir, browserDistDir, {
            // We no longer need a filter here as the manifest is in the root.
        });

        // Read the base manifest file
        const baseManifestPath = path.join(projectRoot, 'manifest.json');
        const manifest = await fs.readJson(baseManifestPath);

        // --- Browser-specific modifications ---
        if (browser === 'firefox') {
            manifest.background = {
                "scripts": ["lib/browser-polyfill.min.js", "scripts/webhook-client.js", "scripts/streamview-client.js", "scripts/background.js"]
            };
            manifest.browser_specific_settings = {
                "gecko": {
                    // This ID is required for storage.sync to work during development.
                    "id": "plus2@awful.fun"
                }
            };

        } else { // Chrome (and other Chromium browsers)
            manifest.background = {
                "service_worker": "scripts/background.js"
            };
            // Remove localhost permissions for Chrome builds (but not dev builds)
            if (browser !== 'chrome-dev' && manifest.host_permissions) {
                manifest.host_permissions = manifest.host_permissions.filter(
                    permission => !permission.includes('localhost')
                );
            }
            if (browser !== 'chrome-dev' && manifest.content_security_policy?.extension_pages) {
                manifest.content_security_policy.extension_pages = manifest.content_security_policy.extension_pages.replace(
                    ' http://localhost:*;', ''
                );
            }
            // The polyfill is loaded via the HTML script tags for UI,
            // but for the service worker, we need to import it and the clients.
            const bgPath = path.join(browserDistDir, 'scripts', 'background.js');
            const bgContent = await fs.readFile(bgPath, 'utf-8');
            await fs.writeFile(bgPath, `importScripts('../lib/browser-polyfill.min.js', 'webhook-client.js', 'streamview-client.js');\n\n${bgContent}`);
        }

        // Write the final manifest file
        await fs.writeJson(path.join(browserDistDir, 'manifest.json'), manifest, { spaces: 2 });

        console.log(`✅ Successfully built for ${browser}`);

        // After the build is complete, zip the directory for distribution
        if (browser === 'firefox' || browser === 'chrome') {
            const version = packageJson.version;
            const zipName = `plus2-${browser}-v${version}.zip`;
            const zipPath = path.join(distDir, zipName);

            console.log(`\nZipping for ${browser}...`);
            await zipDirectory(browserDistDir, zipPath);
            console.log(`📦 Successfully created ${zipPath}`);
        }
    } catch (err) {
        console.error(`❌ Error building for ${browser}:`, err);
    }
}

const targetBrowser = process.argv[2];
if (targetBrowser) {
    build(targetBrowser);
} else {
    console.log('Building for all browsers...');
    build('chrome');
    build('firefox');
}