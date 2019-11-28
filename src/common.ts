import anymatch from 'anymatch';
import * as fs from 'fs';
import * as imagemin from 'imagemin';
import * as imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import * as path from 'path';
import * as prettyBytes from 'pretty-bytes';

import { IGNORED_FILE_SIZE, IGNORED_PATHS, IMAGE_EXTENSIONS, MOZJPEG_OPTIONS, PNGQUANT_OPTIONS } from './constants';
import { TaskScheduler } from './scheduler';

export function shouldIgnorePath(filePath: string) {
  return anymatch(IGNORED_PATHS, filePath) || !IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function getDestPath(source: string, dest: string, filePath: string) {
  return path.join(dest, path.relative(source, filePath));
}

export function logFileEvent(
  event: string,
  detail: {
    from: string;
    to?: string;
    origin?: number;
    output?: number;
    modifiedAt?: Date | string;
    error?: Error;
  },
) {
  const { from, to, origin, output, modifiedAt, error } = detail;

  console.info(
    `${event}: "${from}" -> "${to}"`,
    JSON.stringify({
      origin: origin && prettyBytes(origin),
      output: output && prettyBytes(output),
      modifiedAt: modifiedAt instanceof Date ? modifiedAt.toISOString() : modifiedAt,
    }),
  );

  if (error) {
    console.error(error);
  }
}

export async function runImagemin(fromPath: string, toPath: string) {
  return imagemin([fromPath], {
    destination: toPath,
    plugins: [imageminPngquant(PNGQUANT_OPTIONS), imageminMozjpeg(MOZJPEG_OPTIONS)],
  });
}

/**
 * Wrapper of fs.stat.
 * Returns null when file does not exists.
 *
 * @param p file path
 * @returns fs.Stats | null
 */
export async function safeFsStat(p: string) {
  return fs.promises.stat(p).catch(err => {
    if (err.code === 'ENOENT') return null;
    throw err;
  });
}

interface CompressRequest {
  sourcePath: string;
  destPath: string;
}

const taskScheduler = new TaskScheduler<CompressRequest>(async (requests: CompressRequest[]) => {
  await Promise.all(
    requests.map(async ({ sourcePath, destPath }) => {
      try {
        await runImagemin(sourcePath, path.dirname(destPath));

        const sourceStats = await safeFsStat(sourcePath);
        const destStats = await safeFsStat(destPath);

        logFileEvent('compressed', {
          from: sourcePath,
          to: destPath,
          origin: sourceStats?.size,
          output: destStats?.size,
        });
        return destStats;
      } catch (e) {
        logFileEvent('compress-failed', {
          from: sourcePath,
          to: destPath,
          error: e,
        });
        return;
      }
    }),
  );
  return [];
});

export async function compressToDest(source: string, dest: string, filePath: string) {
  const destPath = getDestPath(source, dest, filePath);
  const fileStat = await safeFsStat(filePath);
  if (!fileStat) {
    logFileEvent('not-found', { from: filePath });
    return false;
  }

  if (fileStat.size < IGNORED_FILE_SIZE) {
    logFileEvent('skip-small', { from: filePath });
    return false;
  }

  const destStat = await safeFsStat(destPath);
  if (destStat && destStat.mtime >= fileStat.mtime) {
    logFileEvent('not-modified', { from: filePath, to: destPath, modifiedAt: destStat.mtime });
    return false;
  }

  logFileEvent('modified', { from: filePath, to: destPath, modifiedAt: fileStat.mtime });
  taskScheduler.push({
    sourcePath: filePath,
    destPath: destPath,
  });
  return true;
}

export async function removeDestFile(source: string, dest: string, filePath: string) {
  const destPath = getDestPath(source, dest, filePath);
  logFileEvent('deleted', { from: filePath, to: destPath });

  // Make sure have write permission
  try {
    await fs.promises.access(destPath, fs.constants.F_OK | fs.constants.W_OK);
  } catch (e) {
    logFileEvent('skip-delete', { from: filePath, to: destPath });
    return;
  }

  await fs.promises.unlink(destPath);
}
