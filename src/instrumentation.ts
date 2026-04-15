export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { buildIndex } = await import("./lib/indexer");
    const { syncGithub } = await import("./lib/github-sync");

    // Sync GitHub before indexing so the snapshot is available to the index.
    await syncGithub().catch((e) => console.warn("[instrumentation] syncGithub failed:", e));
    await buildIndex();

    // Watch /knowledge for changes and re-index automatically
    const path = await import("path");
    const chokidar = await import("chokidar");

    const knowledgeDir = path.join(process.cwd(), "knowledge");
    const watcher = chokidar.watch(knowledgeDir, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    const onChange = async (filePath: string) => {
      if (!/\.(md|txt|pdf|json)$/i.test(filePath)) return;
      console.log(`[watcher] Detected change in ${path.basename(filePath)} — re-indexing…`);
      const { invalidateConfigCache } = await import("./lib/knowledge-config");
      const { invalidateGithubCache, syncGithub } = await import("./lib/github-sync");
      invalidateConfigCache();
      invalidateGithubCache();
      if (/github\.json$/i.test(filePath)) {
        await syncGithub().catch((e) => console.warn("[watcher] syncGithub failed:", e));
      }
      if (!/\.json$/i.test(filePath)) {
        await buildIndex();
      }
    };

    watcher.on("add", onChange);
    watcher.on("change", onChange);
    watcher.on("unlink", onChange);
  }
}
