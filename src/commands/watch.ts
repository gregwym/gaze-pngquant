import * as fs from 'fs';
import watch from 'node-watch';
import * as path from 'path';

import { getDestPath, logFileEvent, runImagemin, safeFsStat, shouldIgnore } from '../common';
import { IGNORED_FILE_SIZE } from '../constants';
import { TaskScheduler } from '../scheduler';
import { WatchCmdOptions } from '../types';

interface CompressRequest {
  sourcePath: string;
  destPath: string;
  sourceStats: fs.Stats;
}

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  const taskScheduler = new TaskScheduler<CompressRequest>(async (requests: CompressRequest[]) => {
    await Promise.all(
      requests.map(async ({ sourcePath, destPath, sourceStats }) => {
        try {
          await runImagemin(sourcePath, path.dirname(destPath));

          const destStats = await safeFsStat(destPath);

          logFileEvent('compressed', {
            from: sourcePath,
            to: destPath,
            origin: sourceStats.size,
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

  async function onChange(filePath: string) {
    const destPath = getDestPath(source, dest, filePath);
    const fileStat = await safeFsStat(filePath);
    if (!fileStat) {
      logFileEvent('not-found', { from: filePath });
      return;
    }

    if (fileStat.size < IGNORED_FILE_SIZE) {
      logFileEvent('skip-small', { from: filePath });
    }

    const destStat = await safeFsStat(destPath);
    if (destStat && destStat.mtime >= fileStat.mtime) {
      logFileEvent('not-modified', { from: filePath, to: destPath, modifiedAt: destStat.mtime });
    }

    logFileEvent('modified', { from: filePath, to: destPath, modifiedAt: fileStat.mtime });
    taskScheduler.push({
      sourcePath: filePath,
      destPath: destPath,
      sourceStats: fileStat,
    });
  }

  async function onRemove(filePath: string) {
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

  console.info(`Start to watch ${source} and will output to ${dest}.`);

  const watcher = watch(source, { recursive: true, filter: p => !shouldIgnore(p) }, async (fileEvent, filePath) => {
    try {
      if (fileEvent === 'update') {
        await onChange(filePath);
      } else if (fileEvent === 'remove') {
        await onRemove(filePath);
      }
    } catch (e) {
      console.error('Handler error: ', e);
    }
  });

  watcher.on('ready', () => {
    console.info(`Ready for changes in ${source} and will output to ${dest}.`);
  });

  watcher.on('error', error => console.error(`Watcher error: ${error}`));

  process.on('SIGINT', () => {
    console.info('Watch terminates');
    watcher.close();
    process.exit(0);
  });
}
