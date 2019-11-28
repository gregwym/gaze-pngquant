import watch from 'node-watch';

import { compressToDest, removeDestFile, shouldIgnore } from '../common';
import { WatchCmdOptions } from '../types';

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  console.info(`Start to watch ${source} and will output to ${dest}.`);

  const watcher = watch(source, { recursive: true, filter: p => !shouldIgnore(p) }, async (fileEvent, filePath) => {
    try {
      if (fileEvent === 'update') {
        await compressToDest(source, dest, filePath);
      } else if (fileEvent === 'remove') {
        await removeDestFile(source, dest, filePath);
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
