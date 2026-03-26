import { Octokit } from '@octokit/rest';
import { DiffResult, FileChange, PRMetadata } from './types.js';

export async function fetchGitHubPR(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<DiffResult> {
  const octokit = new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
  });

  try {
    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Fetch PR files
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // Fetch diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });

    const metadata: PRMetadata = {
      number: prNumber,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      url: pr.html_url,
    };

    const fileChanges: FileChange[] = files.map(file => {
      let type: FileChange['type'] = 'modified';
      if (file.status === 'added') type = 'added';
      else if (file.status === 'removed') type = 'deleted';
      else if (file.status === 'renamed') type = 'renamed';

      return {
        path: file.filename,
        type,
        oldPath: file.previous_filename,
        additions: file.additions,
        deletions: file.deletions,
        diff: file.patch || '',
      };
    });

    return {
      files: fileChanges,
      metadata,
      source: 'github',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch GitHub PR: ${error.message}`);
    }
    throw error;
  }
}

export function parseGitHubURL(input: string): { owner: string; repo: string; prNumber: number } | null {
  // Matches: owner/repo#123 or https://github.com/owner/repo/pull/123
  const shortMatch = input.match(/^([^\/]+)\/([^#]+)#(\d+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      prNumber: parseInt(shortMatch[3], 10),
    };
  }

  const urlMatch = input.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      prNumber: parseInt(urlMatch[3], 10),
    };
  }

  return null;
}
