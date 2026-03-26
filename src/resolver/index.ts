import { DiffResult, ResolverOptions } from './types.js';
import { fetchGitHubPR, parseGitHubURL } from './github.js';
import { readLocalDiff, parseDiffContent } from './local.js';

export async function resolveDiff(
  target: string,
  options: ResolverOptions = {}
): Promise<DiffResult> {
  // Check if it's a local file
  if (options.patchFile) {
    return readLocalDiff(options.patchFile);
  }

  // Check if it's raw diff content
  if (options.diff) {
    return parseDiffContent(options.diff);
  }

  // Try to parse as GitHub PR
  const ghParsed = parseGitHubURL(target);
  if (ghParsed) {
    return fetchGitHubPR(
      ghParsed.owner,
      ghParsed.repo,
      ghParsed.prNumber,
      options.githubToken
    );
  }

  // Try to read as local file
  try {
    return await readLocalDiff(target);
  } catch {
    throw new Error(
      `Could not resolve target: ${target}. Expected GitHub PR (owner/repo#123) or local patch file.`
    );
  }
}

export * from './types.js';
export * from './github.js';
export * from './local.js';
