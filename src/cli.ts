import { Command } from 'commander';

import { startCompress } from './commands/compress';
import { startWatch } from './commands/watch';

const program = new Command();

program
  .command('watch <source> <dest>')
  .description(`run imagemin when files change in <source> and output to <dest>`)
  .action(startWatch);

program
  .command('compress <source> <dest>')
  .option('-a --after <datetime>', 'only process file that are modified after this datetime in ISO format')
  .option('-b --before <datetime>', 'only process file that are modified before this datetime in ISO format')
  .description(`run imagemin when files change in <source> and output to <dest>`)
  .action(startCompress);

program.parse(process.argv);
