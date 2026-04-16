export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { compileWiki } = await import("./lib/wiki-compiler");
    const { syncGithub } = await import("./lib/github-sync");

    // Sync GitHub before compiling wiki so the snapshot is available.
    await syncGithub().catch((e) => console.warn("[instrumentation] syncGithub failed:", e));
    await compileWiki();

    // Watch /knowledge for changes and re-compile wiki automatically
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
      console.log(`[watcher] Detected change in ${path.basename(filePath)} — re-compiling wiki…`);
      const { invalidateConfigCache } = await import("./lib/knowledge-config");
      const { invalidateGithubCache, syncGithub } = await import("./lib/github-sync");
      invalidateConfigCache();
      invalidateGithubCache();
      if (/github\.json$/i.test(filePath)) {
        await syncGithub().catch((e) => console.warn("[watcher] syncGithub failed:", e));
      }
      await compileWiki();
    };

    watcher.on("add", onChange);
    watcher.on("change", onChange);
    watcher.on("unlink", onChange);
  }
}
