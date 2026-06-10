import fs from "fs";
import path from "path";
import yaml from "js-yaml";
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
  CFIRepositoryPageData,
} from "../../types/cfi";

interface OcsfFileRef {
  filePath: string;
  fileName: string;
}

/** Directories under a configuration root that may contain OCSF result JSON. */
function collectOcsfScanDirs(configDir: string): string[] {
  const dirs: string[] = [];

  const addIfPresent = (candidate: string) => {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      dirs.push(candidate);
    }
  };

  addIfPresent(path.join(configDir, "results"));
  addIfPresent(path.join(configDir, "evaluation_results", "ocsf"));

  const outputDir = path.join(configDir, "output");
  if (fs.existsSync(outputDir) && fs.statSync(outputDir).isDirectory()) {
    for (const entry of fs.readdirSync(outputDir)) {
      addIfPresent(path.join(outputDir, entry, "ocsf"));
    }
  }

  return dirs;
}

function collectOcsfFiles(configDir: string): OcsfFileRef[] {
  const refs: OcsfFileRef[] = [];
  const seen = new Set<string>();

  for (const scanDir of collectOcsfScanDirs(configDir)) {
    for (const fileName of fs.readdirSync(scanDir).filter((f) => f.endsWith(".ocsf.json"))) {
      const filePath = path.join(scanDir, fileName);
      if (seen.has(filePath)) {
        continue;
      }
      seen.add(filePath);
      refs.push({ filePath, fileName });
    }
  }

  return refs;
}

function findHtmlForOcsf(configDir: string, ocsfPath: string): string | undefined {
  const htmlName = `${path.basename(ocsfPath).replace(/\.ocsf\.json$/, "")}.html`;
  const candidates = [
    path.join(path.dirname(ocsfPath), htmlName),
    path.join(path.dirname(path.dirname(ocsfPath)), "html", htmlName),
    path.join(configDir, "results", htmlName),
    path.join(configDir, "evaluation_results", "html", htmlName),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function collectStandaloneHtmlFiles(configDir: string, pairedHtml: Set<string>): string[] {
  const htmlFiles: string[] = [];
  const seen = new Set<string>();

  const addFromDir = (dir: string) => {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return;
    }
    for (const fileName of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
      const filePath = path.join(dir, fileName);
      if (seen.has(filePath) || pairedHtml.has(fileName)) {
        continue;
      }
      seen.add(filePath);
      htmlFiles.push(filePath);
    }
  };

  addFromDir(path.join(configDir, "results"));
  addFromDir(path.join(configDir, "evaluation_results", "html"));

  const outputDir = path.join(configDir, "output");
  if (fs.existsSync(outputDir) && fs.statSync(outputDir).isDirectory()) {
    for (const entry of fs.readdirSync(outputDir)) {
      addFromDir(path.join(outputDir, entry, "html"));
    }
  }

  return htmlFiles;
}

function isCfiResultDirectory(repoPath: string, dirName: string): boolean {
  const fullPath = path.join(repoPath, dirName);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return false;
  }

  return ["config", "output", "results", "actions-config"].some((subdir) => {
    const candidate = path.join(fullPath, subdir);
    return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
  });
}

function loadCfiConfig(configDir: string, configFolderName: string): CFIConfigJson {
  const namedConfigPath = path.join(configDir, "config", `${configFolderName}.json`);
  if (fs.existsSync(namedConfigPath)) {
    return JSON.parse(fs.readFileSync(namedConfigPath, "utf8")) as CFIConfigJson;
  }

  const configDirPath = path.join(configDir, "config");
  if (fs.existsSync(configDirPath)) {
    const jsonFiles = fs.readdirSync(configDirPath).filter((f) => f.endsWith(".json"));
    if (jsonFiles.length > 0) {
      return JSON.parse(fs.readFileSync(path.join(configDirPath, jsonFiles[0]), "utf8")) as CFIConfigJson;
    }
  }

  const actionsConfigDir = path.join(configDir, "actions-config");
  if (fs.existsSync(actionsConfigDir)) {
    const yamlFiles = fs.readdirSync(actionsConfigDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    for (const yamlFile of yamlFiles) {
      const doc = yaml.load(fs.readFileSync(path.join(actionsConfigDir, yamlFile), "utf8")) as { cfi?: Record<string, unknown> };
      const cfi = doc?.cfi;
      if (cfi && typeof cfi.id === "string") {
        return {
          id: cfi.id,
          provider: String(cfi.provider ?? ""),
          service: String(cfi.service ?? ""),
          name: String(cfi.name ?? cfi.id),
          description: String(cfi.description ?? ""),
          path: String(cfi.path ?? ""),
          git: typeof cfi.git === "string" ? cfi.git : undefined,
        };
      }
    }
  }

  throw new Error(`No CFI configuration metadata found in ${configDir}`);
}

/**
 * Process all OCSF results and partition them by product, vendor, and version
 */
function partitionOCSFResultsByMetadata(configDir: string): Map<string, ConfigurationResult & { contributingFiles: Set<string> }> {
  const partitionMap = new Map<string, ConfigurationResult & { contributingFiles: Set<string> }>();
  const ocsfFiles = collectOcsfFiles(configDir);

  if (ocsfFiles.length === 0) {
    console.log(`📂 No OCSF result files found under ${configDir}`);
    return partitionMap;
  }

  console.log(`📂 Found ${ocsfFiles.length} OCSF result files in ${configDir}`);

  for (const { filePath, fileName } of ocsfFiles) {
    const result = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(result) as any[];

    if (parsed != null) {
      console.log(`📊 Partitioning ${parsed.length} OCSF items from ${fileName}`);

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
        partitionMap.get(key)!.contributingFiles.add(fileName);

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
): Promise<{ configuration: Configuration; configurationResultSummaries: ConfigurationResultSummary[] }> {
  console.log(`🔍 Processing configuration directory: ${configDir}`);

  const configFolderName = path.basename(configDir);
  const repoDir = repoEntry.destination;
  const sourceDetails = loadSourceDetails(configDir);

  const config = loadCfiConfig(configDir, configFolderName);

  const resultsRelativePath = path.posix.join(repoDir, configFolderName);
  const configurationPath = `/cfi/${resultsRelativePath}`;

  const partitionedResults = partitionOCSFResultsByMetadata(configDir);

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
  const ocsfFiles = collectOcsfFiles(configDir);
  const pairedHtml = new Set<string>();

  for (const { filePath, fileName } of ocsfFiles) {
    fs.copyFileSync(filePath, path.join(staticDownloadsDir, fileName));
    downloadLinks.push({ name: fileName, url: `/downloads/cfi/${repoDir}/${configFolderName}/${fileName}`, type: "ocsf" });

    const htmlPath = findHtmlForOcsf(configDir, filePath);
    if (htmlPath) {
      const htmlName = path.basename(htmlPath);
      pairedHtml.add(htmlName);
      fs.copyFileSync(htmlPath, path.join(staticDownloadsDir, htmlName));
      downloadLinks.push({ name: htmlName, url: `/downloads/cfi/${repoDir}/${configFolderName}/${htmlName}`, type: "html" });
    }
  }

  for (const htmlPath of collectStandaloneHtmlFiles(configDir, pairedHtml)) {
    const htmlName = path.basename(htmlPath);
    fs.copyFileSync(htmlPath, path.join(staticDownloadsDir, htmlName));
    downloadLinks.push({ name: htmlName, url: `/downloads/cfi/${repoDir}/${configFolderName}/${htmlName}`, type: "html" });
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

    const resultJsonPath = await createData(`cfi-config-result-${repoEntry.name}-${configFolderName}-${resultKey}.json`, JSON.stringify(resultPageData));

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

  const jsonPath = await createData(`cfi-config-${repoEntry.name}-${configFolderName}.json`, JSON.stringify(pageData));

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
  return { configuration, configurationResultSummaries };
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

      const { repositories: repoList } = JSON.parse(fs.readFileSync(cfiRepoListPath, "utf8")) as {
        repositories: CFIDataRepositoryEntry[];
      };

      const repositorySummaries: HomePageData["repositories"] = [];

      for (const repoEntry of repoList) {
        const repoDir = repoEntry.destination;
        const repoPath = path.join(testResultsDir, repoDir);
        const repoHref = `/cfi/${repoDir}`;

        const repoConfigurations: Configuration[] = [];
        const configurationResultSummariesByPath: Record<string, ConfigurationResultSummary[]> = {};

        if (fs.existsSync(repoPath)) {
          console.log(`Processing repository: ${repoDir}`);

          const configDirs = fs.readdirSync(repoPath).filter((dir) => isCfiResultDirectory(repoPath, dir));
          console.log(`Found ${configDirs.length} configurations in ${repoDir}:`, configDirs);

          for (const configDir of configDirs) {
            const fullConfigDir = path.join(repoPath, configDir);

            try {
              const { configuration, configurationResultSummaries } = await createConfiguration(
                fullConfigDir,
                repoEntry,
                context.siteDir,
                createData,
                addRoute
              );
              repoConfigurations.push(configuration);
              configurationResultSummariesByPath[configuration.results_relative_path] = configurationResultSummaries;
            } catch (error) {
              console.error(`Error processing configuration ${configDir} in ${repoDir}:`, error);
            }
          }
        } else {
          console.log(`No test-results directory for ${repoDir}, registering empty repository page`);
        }

        const repoPageData: CFIRepositoryPageData = {
          repository: repoEntry,
          href: repoHref,
          configurations: repoConfigurations,
          configurationResultSummariesByPath,
          generatedAt: new Date().toISOString(),
        };

        const repoPagePath = await createData(`cfi-repo-${repoEntry.name}.json`, JSON.stringify(repoPageData));

        addRoute({
          path: repoHref,
          component: "@site/src/components/cfi/Repository/index.tsx",
          modules: {
            pageData: repoPagePath,
          },
          exact: true,
        });

        repositorySummaries.push({
          name: repoEntry.name,
          url: repoEntry.url,
          description: repoEntry.description,
          destination: repoEntry.destination,
          href: repoHref,
          configurationCount: repoConfigurations.length,
        });

        console.log(`✅ Created repository page at ${repoHref} (${repoConfigurations.length} configurations)`);
      }

      const homePageData: HomePageData = {
        repositories: repositorySummaries,
        generatedAt: new Date().toISOString(),
      };

      const homePagePath = await createData("cfi-home.json", JSON.stringify(homePageData));

      addRoute({
        path: "/cfi",
        component: "@site/src/components/cfi/Home/index.tsx",
        modules: {
          pageData: homePagePath,
        },
        exact: true,
      });

      console.log("Added route for /cfi and per-repository CFI pages");
    },
  };
}
