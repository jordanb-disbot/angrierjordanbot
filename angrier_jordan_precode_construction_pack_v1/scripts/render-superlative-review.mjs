// Compatibility entry point. The consolidated package includes current controls,
// privacy/error states and per-item owner-review metadata for Superlatives.
import './render-gate-b-community-chairisms.mjs';
import fs from 'node:fs';
function writeChanged(file,data){const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);if(fs.existsSync(file)&&fs.readFileSync(file).equals(bytes))return;fs.writeFileSync(file,bytes);}
function copyChanged(source,target){writeChanged(target,fs.readFileSync(source));}
const root=new URL('../review-gate-b/superlative/',import.meta.url);
for(const size of ['desktop','mobile'])copyChanged(new URL(`winner-${size}.png`,root),new URL(`${size}.png`,root));
writeChanged(new URL('fixture.json',root),JSON.stringify(JSON.parse(fs.readFileSync(new URL('winner-fixture.json',root),'utf8')).fixture,null,2)+'\n');
copyChanged(new URL('winner-transcript.txt',root),new URL('transcript.txt',root));
import {createHash} from 'node:crypto';
writeChanged(new URL('manifest.json',root),JSON.stringify({kind:'actual-production-renderer-fixture',fictionalMembers:true,liveDiscordCapture:false,renderer:'packages/features-community/src/render.ts',rendererSha256:createHash('sha256').update(fs.readFileSync(new URL('../packages/features-community/src/render.ts',import.meta.url))).digest('hex'),files:['desktop.png','mobile.png'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex')}))},null,2)+'\n');
