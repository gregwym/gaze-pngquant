import { FSWatcher, watch } from 'chokidar';
import { promises as fs, Stats as FileStats } from 'fs';
import * as moment from 'moment';
import * as path from 'path';

import { getDestPath, logFileEvent, runImagemin } from './common';
import { IGNORED_PATHS, IMAGE_EXTENSIONS } from './constants';
import { TaskScheduler } from './scheduler';
import { WatchCmdOptions } from './types';

function safeHandler<T>(
  func: (filePath: string, stat: FileStats) => Promise<T>,
): (filePath: string, stat: FileStats) => Promise<void> {
  return function(filePath: string, stat: FileStats) {
    return func(filePath, stat)
      .then(out => {
        // console.debug('Handler output', out);
      })
      .catch(e => {
        console.error(e);
      });
  };
}

interface CompressRequest {
  sourcePath: string;
  destPath: string;
  sourceStats?: FileStats;
}

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  const { initialize, since } = options;

  const taskScheduler = new TaskScheduler<CompressRequest>(async (requests: CompressRequest[]) => {
    await Promise.all(
      requests.map(async ({ sourcePath, destPath, sourceStats }) => {
        try {
          await runImagemin(sourcePath, path.dirname(destPath));

          const destStats = await fs.stat(destPath);

          logFileEvent('compressed', {
            from: sourcePath,
            to: destPath,
            origin: sourceStats?.size,
            output: destStats.size,
          });
          return destStats;
        } catch (e) {
          logFileEvent('failed', {
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

  async function onChange(filePath: string, fileStats?: FileStats) {
    if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
      return;
    }

    const destPath = getDestPath(source, dest, filePath);
    const modifiedAt = fileStats?.mtime;
    if (since && modifiedAt && moment(since).isAfter(modifiedAt)) {
      logFileEvent('skipped', { from: filePath, to: destPath, modifiedAt: modifiedAt });
    }

    logFileEvent('modified', { from: filePath, to: destPath, modifiedAt: modifiedAt });
    taskScheduler.push({
      sourcePath: filePath,
      destPath: destPath,
      sourceStats: fileStats,
    });
  }

  async function onRemove(filePath: string) {
    const destPath = getDestPath(source, dest, filePath);
    logFileEvent('deleted', { from: filePath, to: destPath });
    return fs.unlink(destPath);
  }

  async function addHandlers(watcher: FSWatcher) {
    watcher.on('add', safeHandler(onChange));
    watcher.on('change', safeHandler(onChange));
    watcher.on('unlink', safeHandler(onRemove));
    watcher.on('unlinkDir', safeHandler(onRemove));
  }

  console.info(`Start to watch ${source} and will output to ${dest}.`);

  const watcher = watch(source, {
    awaitWriteFinish: true,
    ignored: IGNORED_PATHS,
    ignoreInitial: !initialize,
  });
  addHandlers(watcher);

  watcher.on('ready', () => {
    console.info(`Ready for changes in ${source} and will output to ${dest}.`);
  });

  watcher.on('error', error => console.error(`Watcher error: ${error}`));

  process.on('SIGINT', () => {
    console.info('Watch terminates');
    watcher.close();
  });
}
