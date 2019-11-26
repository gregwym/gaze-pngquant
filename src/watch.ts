import { FSWatcher, watch } from 'chokidar';
import { promises as fs, Stats as FileStats } from 'fs';
import * as path from 'path';

import { getDestPath, logFileEvent, runImagemin } from './common';
import { IMAGE_EXTENSIONS } from './constants';
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

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  async function onChange(filePath: string, fileStats?: FileStats) {
    if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
      return;
    }

    const destPath = getDestPath(source, dest, filePath);
    logFileEvent('modified', { from: filePath, to: destPath });

    await runImagemin(filePath, path.dirname(destPath));

    const destStats = await fs.stat(destPath);
    logFileEvent('compressed', {
      from: filePath,
      to: destPath,
      origin: fileStats && fileStats.size,
      output: destStats.size,
    });
    return destStats;
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

  const watcher = watch(source, {
    awaitWriteFinish: true,
  });

  if (options.initialize) {
    console.info(`Initializing ${source} and will output to ${dest}.`);
    addHandlers(watcher);
  }

  watcher.on('ready', () => {
    if (!options.initialize) {
      addHandlers(watcher);
    }
    console.info(`Watching changes in ${source} and will output to ${dest}.`);
  });

  watcher.on('error', error => console.error(`Watcher error: ${error}`));
}
