import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const framework=process.argv[2];if(!['react','vue'].includes(framework))throw new Error('Specify react or vue');
const cwd=resolve('.local-validation/ecosystem',framework);
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',framework==='react'?'5321':'5322','--strictPort'],{cwd,stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code??1});
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));
