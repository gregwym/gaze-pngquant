import { Command } from 'commander';

import { startWatch } from './commands/watch';

const program = new Command();

program
  .command('watch <source> <dest>')
  .description(`run imagemin when files change in <source> and output to <dest>`)
  .action(startWatch);

program.parse(process.argv);
