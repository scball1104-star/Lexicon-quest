'use strict';
// Keep local verification, Netlify and Pages on one authoritative command.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
const command=fs.readFileSync('netlify.toml','utf8').match(/^\s*command\s*=\s*"([^"]+)"/m)?.[1];
if(!command||command.includes('run-gate.cjs'))throw Error('Missing or recursive deploy gate');
const result=cp.spawnSync(command,{shell:true,stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
