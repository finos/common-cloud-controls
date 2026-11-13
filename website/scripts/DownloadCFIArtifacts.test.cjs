const assert = require('node:assert/strict');
const { test } = require('node:test');
const axios = require('axios');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

require('ts-node').register({ compilerOptions: { module: 'CommonJS' } });

const {
    getArtifacts,
    getLatestRunWithArtifactsForBranch,
} = require('./DownloadCFIArtifacts.ts');

const workflowPath = '.github/workflows/cfi-test.yml';
const run = (id, conclusion = 'success', path = workflowPath) => ({
    id,
    conclusion,
    path,
});
const artifact = (name, expired = false) => ({ name, expired });
const findRun = () => getLatestRunWithArtifactsForBranch(
    'finos', 'common-cloud-controls', 'feature/test', 123,
    workflowPath, 'finos-integration-*'
);

test('finds a usable run beyond the first 100 workflow runs', async (t) => {
    t.mock.method(axios, 'get', async (url, options) => {
        if (url.endsWith('/actions/workflows/123/runs')) {
            assert.equal(options.params.branch, 'feature/test');
            assert.equal(options.params.status, 'completed');
            assert.equal(options.params.per_page, 100);
            return {
                data: {
                    workflow_runs: options.params.page === 1
                        ? Array.from({ length: 100 }, (_, i) => run(i + 1))
                        : [run(101)],
                },
            };
        }
        assert.match(url, /\/actions\/runs\/\d+\/artifacts$/);
        return {
            data: {
                artifacts: url.endsWith('/101/artifacts')
                    ? [artifact('finos-integration-storage')]
                    : [],
            },
        };
    });
    assert.equal((await findRun()).id, 101);
});

test('paginates artifacts without dropping later matches', async (t) => {
    const pages = [];
    t.mock.method(axios, 'get', async (url, options) => {
        assert.ok(url.endsWith('/actions/runs/42/artifacts'));
        pages.push(options.params.page);
        return {
            data: {
                artifacts: options.params.page === 1
                    ? Array.from({ length: 100 }, () => artifact('other'))
                    : [artifact('finos-integration-storage')],
            },
        };
    });
    const artifacts = await getArtifacts('finos', 'common-cloud-controls', 42);
    assert.equal(artifacts.length, 101);
    assert.equal(artifacts[100].name, 'finos-integration-storage');
    assert.deepEqual(pages, [1, 2]);
});

test('skips unrelated, cancelled, and expired runs but accepts partial results', async (t) => {
    t.mock.method(axios, 'get', async (url) => {
        if (url.endsWith('/actions/workflows/123/runs')) {
            return {
                data: {
                    workflow_runs: [
                        run(1, 'success', '.github/workflows/release.yml'),
                        run(2, 'cancelled'),
                        run(3),
                        run(4, 'failure'),
                    ],
                },
            };
        }
        assert.ok(url.endsWith('/3/artifacts') || url.endsWith('/4/artifacts'));
        return {
            data: {
                artifacts: [
                    artifact('finos-integration-storage', url.endsWith('/3/artifacts')),
                ],
            },
        };
    });
    assert.equal((await findRun()).id, 4);
});

test('returns null when the available workflow runs are exhausted', async (t) => {
    t.mock.method(axios, 'get', async () => ({
        data: { workflow_runs: [] },
    }));
    assert.equal(await findRun(), null);
});

test('propagates workflow and artifact API failures', async (t) => {
    const error = new Error('GitHub authentication failed');
    t.mock.method(axios, 'get', async () => { throw error; });
    await assert.rejects(findRun(), error);
    await assert.rejects(
        getArtifacts('finos', 'common-cloud-controls', 42),
        error
    );
});

test('missing credentials exit nonzero instead of publishing empty results', () => {
    const result = spawnSync(process.execPath, [
        require.resolve('ts-node/dist/bin.js'),
        '--compiler-options', '{"module":"CommonJS"}',
        path.join(__dirname, 'DownloadCFIArtifacts.ts'),
    ], {
        env: { ...process.env, GITHUB_TOKEN: '' },
        encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /GITHUB_TOKEN is required/);
});
