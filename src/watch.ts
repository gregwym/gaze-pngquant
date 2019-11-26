import * as path from 'path';
import { promises as fs } from 'fs';

import { watch, FSWatcher } from 'chokidar';

import { getDestPath, runImagemin } from './common';
import { IMAGE_EXTENSIONS } from './constants';
import { WatchCmdOptions } from './types';

function logFileEvent(event: string, filePath: string, destPath: string) {
  console.info(`${event} "${filePath}" -> "${destPath}"`);
}

function safeHandler<T>(func: (filePath: string) => Promise<T>): (filePath: string) => Promise<void> {
  return function(filePath: string) {
    return func(filePath)
      .then(out => {
        console.debug('Handler output', out);
      })
      .catch(e => {
        console.error(e);
      });
  };
}

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  async function onChange(filePath: string) {
    if (!IMAGE_EXTENSIONS.has(path.extname(filePath))) {
      return;
    }

    const destPath = getDestPath(source, dest, filePath);
    logFileEvent('A', filePath, destPath);
    return runImagemin(filePath, path.dirname(destPath));
  }

  async function onRemove(filePath: string) {
    const destPath = getDestPath(source, dest, filePath);
    logFileEvent('D', filePath, destPath);
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
