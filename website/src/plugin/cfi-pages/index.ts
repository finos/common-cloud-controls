import fs from 'fs';
import path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { HomePageData, Configuration, ConfigurationPageData, CFIConfigJson } from '../../types/cfi';




async function createConfiguration(configDir: string, slug: string, repositoryData: any): Promise<Configuration> {
    console.log(`🔍 Processing configuration directory: ${configDir}`);

    // Read the configuration file
    const configPath = path.join(configDir, 'config', `${path.basename(configDir)}.json`);
    console.log(`📁 Config path: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CFIConfigJson;

    // Create simple configuration with repository info
    const configuration: Configuration = {
        cfi_details: config,
        repository: repositoryData,
        slug
    };

    console.log(`✅ Created configuration for ${configuration.cfi_details.id}`);
    return configuration;
}


export default function pluginCFIPages(_: LoadContext): Plugin<void> {
    return {
        name: 'cfi-pages',

        async contentLoaded({ actions }) {
            const { createData, addRoute } = actions;

            const testResultsDir = path.resolve(__dirname, '../../data/test-results');

            // Find all repository directories and their configurations
            const allDirs = fs.readdirSync(testResultsDir);
            console.log(`All directories in test-results:`, allDirs);

            const components: Configuration[] = [];

            for (const repoDir of allDirs) {
                const repoPath = path.join(testResultsDir, repoDir);
                const repositoryJsonPath = path.join(repoPath, 'repository.json');

                if (!fs.existsSync(repositoryJsonPath)) {
                    console.log(`No repository.json found in ${repoDir}, skipping`);
                    continue;
                }

                console.log(`Processing repository: ${repoDir}`);

                // Read repository info
                const repositoryData = JSON.parse(fs.readFileSync(repositoryJsonPath, 'utf8'));

                // Find all configuration directories within this repository
                const configDirs = fs.readdirSync(repoPath).filter(dir => {
                    const configPath = path.join(repoPath, dir, 'config');
                    return fs.existsSync(configPath) && fs.statSync(configPath).isDirectory();
                });

                console.log(`Found ${configDirs.length} configurations in ${repoDir}:`, configDirs);

                for (const configDir of configDirs) {
                    const slug = '/cfi/' + repoDir + '/' + configDir;
                    const fullConfigDir = path.join(repoPath, configDir);

                    try {
                        const configuration = await createConfiguration(fullConfigDir, slug, repositoryData);
                        components.push(configuration);
                    } catch (error) {
                        console.error(`Error processing configuration ${configDir} in ${repoDir}:`, error);
                    }
                }
            }

            // Create home page data
            const homePageData: HomePageData = {
                configurations: components
            };

            const homePagePath = await createData(
                'cfi-home.json',
                JSON.stringify(homePageData, null, 2)
            );

            addRoute({
                path: '/cfi',
                component: '@site/src/components/cfi/Home/index.tsx',
                modules: {
                    pageData: homePagePath,
                },
                exact: true,
            });

            console.log('Added route for /cfi');
        },
    };
}
