import fs from 'fs/promises';
import parseDiff from 'parse-diff';
import { DiffResult, FileChange } from './types.js';

export async function readLocalDiff(patchPath: string): Promise<DiffResult> {
  try {
    const content = await fs.readFile(patchPath, 'utf-8');
    return parseDiffContent(content);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read patch file: ${error.message}`);
    }
    throw error;
  }
}

export function parseDiffContent(diffContent: string): DiffResult {
  const parsed = parseDiff(diffContent);

  const files: FileChange[] = parsed.map(file => {
    let type: FileChange['type'] = 'modified';
    if (file.new && !file.deleted) type = 'added';
    else if (file.deleted) type = 'deleted';
    else if (file.from && file.to && file.from !== file.to) type = 'renamed';

    // Reconstruct the diff for this file
    const chunks = file.chunks.map(chunk => {
      const lines = chunk.changes.map(change => {
        if (change.type === 'add') return `+${change.content}`;
        if (change.type === 'del') return `-${change.content}`;
        return ` ${change.content}`;
      });
      return `@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@\n${lines.join('\n')}`;
    });

    const fileDiff = chunks.join('\n');

    return {
      path: file.to || file.from || 'unknown',
      type,
      oldPath: file.from !== file.to ? file.from : undefined,
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      diff: fileDiff,
    };
  });

  return {
    files,
    source: 'local',
  };
}
