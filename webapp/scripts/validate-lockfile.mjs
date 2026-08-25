import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const requestedPath = process.argv[2];
const lockfilePath = requestedPath ? resolve(requestedPath) : new URL('../package-lock.json', import.meta.url);
const lockfileContents = requestedPath === '-' ? readFileSync(0, 'utf8') : readFileSync(lockfilePath, 'utf8');
const lockfile = JSON.parse(lockfileContents);
const invalidPackages = Object.entries(lockfile.packages ?? {})
    .filter(([packagePath, metadata]) => (
        packagePath &&
        !metadata.link &&
        (typeof metadata.version !== 'string' || !metadata.version.trim())
    ))
    .map(([packagePath]) => packagePath);

if (invalidPackages.length) {
    console.error('Lockfile packages without a valid version:');
    invalidPackages.forEach((packagePath) => console.error(`- ${packagePath}`));
    process.exit(1);
}

console.log(`Lockfile valid: ${Object.keys(lockfile.packages ?? {}).length} package entries checked.`);
