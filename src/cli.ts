import { Command } from 'commander';
import { startWatch } from './watch';

const program = new Command();

program
  .command('watch <source> <dest>')
  .description(`run imagemin when file changes in <path>`)
  .action(startWatch);

program.parse(process.argv);
