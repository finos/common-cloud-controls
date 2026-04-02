import fs from "fs";
import path from "path";
import type { LoadContext, Plugin } from "@docusaurus/types";
import {
  HomePageData,
  Configuration,
  ConfigurationPageData,
  CFIConfigJson,
  CFISourceDetails,
  TestResultItem,
  TestResultType,
  CFIDataRepositoryEntry,
  ConfigurationResult,
  ConfigurationResultPageData,
  ConfigurationResultSummary,
} from "../../types/cfi";

/**
 * Process all OCSF results and partition them by product, vendor, and version
 */
function partitionOCSFResultsByMetadata(resultsDir: string): Map<string, ConfigurationResult & { contributingFiles: Set<string> }> {
  const partitionMap = new Map<string, ConfigurationResult & { contributingFiles: Set<string> }>();

  if (!fs.existsSync(resultsDir)) {
    return partitionMap;
  }

  const resultFiles = fs.readdirSync(resultsDir).filter((f) => f.endsWith("ocsf.json"));
  console.log(`📂 Found ${resultFiles.length} OCSF result files in ${resultsDir}`);

  for (const resultFile of resultFiles) {
    const resultPath = path.join(resultsDir, resultFile);
    const result = fs.readFileSync(resultPath, "utf8");
    const parsed = JSON.parse(result) as any[];

    if (parsed != null) {
      console.log(`📊 Partitioning ${parsed.length} OCSF items from ${resultFile}`);

      parsed.forEach((item, index) => {
        // Extract metadata
        const product = item.metadata?.product?.name || "Unknown Product";
        const vendor = item.metadata?.product?.vendor_name || "Unknown Vendor";
        const version = item.metadata?.product?.version || "Unknown Version";

        // Create unique key for this combination
        const key = `${vendor}::${product}::${version}`;

        // Initialize partition if it doesn't exist
        if (!partitionMap.has(key)) {
          partitionMap.set(key, {
            product,
            vendor,
            version,
            test_results: [],
            contributingFiles: new Set<string>(),
          });
        }

        // Track the source file
        partitionMap.get(key)!.contributingFiles.add(resultFile);

        // Convert OCSF item to TestResultItem
        const resource = item.resources?.[0] || {};
        const testResult: TestResultItem = {
          id: `${item.finding_info?.uid || "unknown"}-${index}`,
          test_requirements: item.unmapped?.compliance?.["CCC"] || [],
          result: item.status_code === "PASS" ? TestResultType.PASS : item.status_code === "FAIL" ? TestResultType.FAIL : TestResultType.NA,
          name: item.finding_info?.title || "Unknown Finding",
          message: item.message || "",
          test: item.metadata?.event_code || "",
          timestamp: item.finding_info?.created_time || Date.now(),
          further_info_url: item.unmapped?.related_url,
          resources: [resource.name || resource.uid || "Unknown Resource"],
          status_code: item.status_code || "UNKNOWN",
          status_detail: item.status_detail || "",
          resource_name: resource.name || resource.uid || "Unknown Resource",
          resource_type: resource.type || "Unknown Type",
          resource_uid: resource.uid,
          ccc_objects: item.unmapped?.compliance?.["CCC"] || [],
          finding_title: item.finding_info?.title || "Unknown Finding",
          finding_uid: item.finding_info?.uid || "",
        };

        partitionMap.get(key)!.test_results.push(testResult);
      });
    }
  }

  return partitionMap;
}

function loadSourceDetails(configDir: string): CFISourceDetails | undefined {
  const sourcePath = path.join(configDir, "source-details.json");
  if (!fs.existsSync(sourcePath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(sourcePath, "utf8")) as CFISourceDetails;
  } catch {
    return undefined;
  }
}

function withSourceDetails(
  base: Omit<Configuration, "source_details">,
  source_details: CFISourceDetails | undefined
): Configuration {
  return source_details ? { ...base, source_details } : { ...base };
}

async function createConfiguration(
  configDir: string,
  repoEntry: CFIDataRepositoryEntry,
  siteDir: string,
  createData: (name: string, data: string | object) => Promise<string>,
  addRoute: (route: any) => void
): Promise<Configuration> {
  console.log(`🔍 Processing configuration directory: ${configDir}`);

  const configFolderName = path.basename(configDir);
  const repoDir = repoEntry.destination;
  const sourceDetails = loadSourceDetails(configDir);

  // Read the configuration file
  const configPath = path.join(configDir, "config", `${configFolderName}.json`);
  console.log(`📁 Config path: ${configPath}`);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as CFIConfigJson;

  const resultsRelativePath = path.posix.join(repoDir, configFolderName);
  const configurationPath = `/cfi/${resultsRelativePath}`;

  // Process OCSF results and partition by product, vendor, version
  const resultsDir = path.join(configDir, "results");
  const partitionedResults = partitionOCSFResultsByMetadata(resultsDir);

  console.log(`📊 Configuration ${config.id}: found ${partitionedResults.size} unique product/vendor/version combinations`);

  // Convert partitioned results to array
  const configurationResults: ConfigurationResult[] = [];

  // Create ConfigurationResultSummary for each result
  const configurationResultSummaries: ConfigurationResultSummary[] = [];

  // Directory for downloads in static folder
  const staticDownloadsDir = path.join(siteDir, "static", "downloads", "cfi", repoDir, configFolderName);
  if (!fs.existsSync(staticDownloadsDir)) {
    fs.mkdirSync(staticDownloadsDir, { recursive: true });
  }

  // Build download links: scan all .ocsf.json and .html files, pair where base names match
  const downloadLinks: { name: string; url: string; type: string }[] = [];
  if (fs.existsSync(resultsDir)) {
    const allFiles = fs.readdirSync(resultsDir);
    const ocsfFiles = allFiles.filter((f) => f.endsWith(".ocsf.json"));
    const htmlFiles = allFiles.filter((f) => f.endsWith(".html"));
    const pairedHtml = new Set<string>();

    for (const ocsfFile of ocsfFiles) {
      const baseName = ocsfFile.replace(/\.ocsf\.json$/, "");
      const htmlFile = `${baseName}.html`;
      const isPaired = htmlFiles.includes(htmlFile);

      fs.copyFileSync(path.join(resultsDir, ocsfFile), path.join(staticDownloadsDir, ocsfFile));
      downloadLinks.push({ name: ocsfFile, url: `/downloads/cfi/${repoDir}/${configFolderName}/${ocsfFile}`, type: "ocsf" });

      if (isPaired) {
        pairedHtml.add(htmlFile);
        fs.copyFileSync(path.join(resultsDir, htmlFile), path.join(staticDownloadsDir, htmlFile));
        downloadLinks.push({ name: htmlFile, url: `/downloads/cfi/${repoDir}/${configFolderName}/${htmlFile}`, type: "html" });
      }
    }

    for (const htmlFile of htmlFiles) {
      if (!pairedHtml.has(htmlFile)) {
        fs.copyFileSync(path.join(resultsDir, htmlFile), path.join(staticDownloadsDir, htmlFile));
        downloadLinks.push({ name: htmlFile, url: `/downloads/cfi/${repoDir}/${configFolderName}/${htmlFile}`, type: "html" });
      }
    }
  }

  // Create a page for each ConfigurationResult
  for (const [key, configResultWithFiles] of partitionedResults.entries()) {
    const { contributingFiles, ...configResult } = configResultWithFiles;

    configResult.download_links = downloadLinks;
    configurationResults.push(configResult);

    // Generate a slug-friendly key
    const resultKey = `${configResult.vendor}-${configResult.product}-${configResult.version}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const resultSlug = `${configurationPath}/${resultKey}`;

    // Calculate summary statistics
    const totalTests = configResult.test_results.length;
    const passingTests = configResult.test_results.filter((r) => r.status_code === "PASS").length;
    const failingTests = configResult.test_results.filter((r) => r.status_code === "FAIL").length;

    // Add to summaries
    configurationResultSummaries.push({
      product: configResult.product,
      vendor: configResult.vendor,
      version: configResult.version,
      slug: resultSlug,
      totalTests,
      passingTests,
      failingTests,
    });

    // Create temporary configuration for this result page
    const configuration = withSourceDetails(
      {
        cfi_details: config,
        results_relative_path: resultsRelativePath,
        results: configurationResults,
      },
      sourceDetails
    );

    // Create ConfigurationResult page data
    const resultPageData: ConfigurationResultPageData = {
      configuration,
      configurationResult: configResult,
    };

    const resultJsonPath = await createData(`cfi-config-result-${repoEntry.name}-${configFolderName}-${resultKey}.json`, JSON.stringify(resultPageData, null, 2));

    // Add route for this ConfigurationResult page
    addRoute({
      path: resultSlug,
      component: "@site/src/components/cfi/ConfigurationResult/index.tsx",
      modules: {
        pageData: resultJsonPath,
      },
      exact: true,
    });

    console.log(`✅ Created ConfigurationResult page at ${resultSlug} (${totalTests} tests)`);
  }

  // Create configuration with repository info and partitioned results
  const configuration = withSourceDetails(
    {
      cfi_details: config,
      results_relative_path: resultsRelativePath,
      results: configurationResults,
    },
    sourceDetails
  );

  // Create configuration page data
  const pageData: ConfigurationPageData = {
    configuration,
    configurationResultSummaries,
  };

  const jsonPath = await createData(`cfi-config-${repoEntry.name}-${configFolderName}.json`, JSON.stringify(pageData, null, 2));

  // Add route for this configuration page
  addRoute({
    path: configurationPath,
    component: "@site/src/components/cfi/Configuration/index.tsx",
    modules: {
      pageData: jsonPath,
    },
    exact: true,
  });

  console.log(`✅ Created configuration page for ${configFolderName} (${configuration.cfi_details.id}) at ${configurationPath}`);
  return configuration;
}

export default function pluginCFIPages(context: LoadContext): Plugin<void> {
  return {
    name: "cfi-pages",

    async contentLoaded({ actions }) {
      const { createData, addRoute } = actions;

      const testResultsDir = path.resolve(__dirname, "../../data/test-results");
      const cfiRepoListPath = path.resolve(__dirname, "../../data/cfi-repositories.json");

      if (!fs.existsSync(cfiRepoListPath)) {
        console.error("cfi-repositories.json not found; cannot discover CFI repositories.");
        return;
      }

      const { repositories: repoList } = JSON.parse(fs.readFileSync(cfiRepoListPath, "utf8")) as { repositories: CFIDataRepositoryEntry[] };

      const components: Configuration[] = [];

      for (const repoEntry of repoList) {
        const repoDir = repoEntry.destination;
        const repoPath = path.join(testResultsDir, repoDir);

        if (!fs.existsSync(repoPath)) {
          console.log(`No test-results directory for ${repoDir}, skipping`);
          continue;
        }

        console.log(`Processing repository: ${repoDir}`);

        // Find all configuration directories within this repository
        const configDirs = fs.readdirSync(repoPath).filter((dir) => {
          const configPath = path.join(repoPath, dir, "config");
          return fs.existsSync(configPath) && fs.statSync(configPath).isDirectory();
        });

        console.log(`Found ${configDirs.length} configurations in ${repoDir}:`, configDirs);

        for (const configDir of configDirs) {
          const fullConfigDir = path.join(repoPath, configDir);

          try {
            const configuration = await createConfiguration(fullConfigDir, repoEntry, context.siteDir, createData, addRoute);
            components.push(configuration);
          } catch (error) {
            console.error(`Error processing configuration ${configDir} in ${repoDir}:`, error);
          }
        }
      }

      // Create home page data
      const homePageData: HomePageData = {
        configurations: components,
        generatedAt: new Date().toISOString(),
      };

      const homePagePath = await createData("cfi-home.json", JSON.stringify(homePageData, null, 2));

      addRoute({
        path: "/cfi",
        component: "@site/src/components/cfi/Home/index.tsx",
        modules: {
          pageData: homePagePath,
        },
        exact: true,
      });

      console.log("Added route for /cfi");
    },
  };
}
