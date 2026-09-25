import { startProductionBot } from './production.js';
startProductionBot().catch(error=>{console.error(error);process.exitCode=1;});
