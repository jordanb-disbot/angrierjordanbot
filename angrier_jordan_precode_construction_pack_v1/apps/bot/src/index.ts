import { startProductionBot } from './production.js';
import {RuntimeConfigurationError} from '../../../packages/core/src/runtime-environment.js';
startProductionBot().catch(error=>{console.error(error instanceof RuntimeConfigurationError?error.message:'Bot startup failed. Check required configuration and service connectivity privately.');process.exitCode=1;});
