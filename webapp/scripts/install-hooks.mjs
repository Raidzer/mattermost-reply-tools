import {chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: process.cwd(),
    encoding: 'utf8',
}).trim();
const preCommitHook = resolve(repositoryRoot, '.githooks', 'pre-commit');

chmodSync(preCommitHook, 0o755);
execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
});

console.log('Git hooks enabled from .githooks');
