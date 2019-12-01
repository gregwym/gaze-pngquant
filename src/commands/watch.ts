import * as NodeCache from 'node-cache';
import watch from 'node-watch';

import { compressToDest, isIgnoredPath, removeDestFile } from '../common';
import { WatchCmdOptions } from '../types';

// Debounce file update event for 5s
const FILE_EVENT_EXPIRE_TTL = 5;

export function startWatch(source: string, dest: string, options: WatchCmdOptions = {}) {
  console.info(`Start to watch ${source} and will output to ${dest}.`);

  const fileEventBuffer = new NodeCache({
    stdTTL: FILE_EVENT_EXPIRE_TTL,
    checkperiod: 1,
  });

  fileEventBuffer.on('expired', async (filePath, fileEvent) => {
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

  const watcher = watch(source, { recursive: true }, async (fileEvent, filePath) => {
    console.info(`event: ${fileEvent} "${filePath}"`);
    if (isIgnoredPath(filePath)) {
      console.info(`ignored: "${filePath}"`);
      return;
    }
    fileEventBuffer.set(filePath, fileEvent);
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
