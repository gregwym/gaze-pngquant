import * as path from 'path';
import { promises as fs } from 'fs';

import { watch } from 'chokidar';

import { getDestPath, runImagemin } from './common';
import { IMAGE_EXTENSIONS } from './constants';

function logAndSafeHandler<T>(func: (filePath: string) => Promise<T>): (filePath: string) => Promise<void> {
  return function(filePath: string) {
    console.debug('Handling fs event', filePath);

    return func(filePath)
      .then(out => {
        console.debug('Handler output', out);
      })
      .catch(e => {
        console.error(e);
      });
  };
}

export function startWatch(source: string, dest: string) {
  async function onChange(filePath: string) {
    console.log(path.extname(filePath));
    if (!IMAGE_EXTENSIONS.has(path.extname(filePath))) {
      return;
    }

    const destPath = getDestPath(source, dest, filePath);
    console.info('A', filePath, destPath);
    return runImagemin(filePath, path.dirname(destPath));
  }

  async function onRemove(filePath: string) {
    const destPath = getDestPath(source, dest, filePath);
    console.info('D', filePath, destPath);
    return fs.unlink(destPath);
  }

  const watcher = watch(source, {
    awaitWriteFinish: true,
  });
  watcher.on('add', logAndSafeHandler(onChange));
  watcher.on('change', logAndSafeHandler(onChange));
  watcher.on('unlink', logAndSafeHandler(onRemove));
  watcher.on('unlinkDir', logAndSafeHandler(onRemove));
  watcher.on('ready', () => console.info('Initial scan complete. Ready for changes'));
  watcher.on('error', error => console.error(`Watcher error: ${error}`));
  console.info('watching', source, 'to', dest);
}
