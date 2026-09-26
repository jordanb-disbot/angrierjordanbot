import fs from 'node:fs';
// Explicitly fictional profile pictures using existing approved chair artwork, never live member photos.
export async function fixtureAvatar(index=0){
 const n=((index%6)+6)%6+1;
 return 'data:image/png;base64,'+fs.readFileSync(new URL(`../production/event_art/v3/race_chair_${n}.png`,import.meta.url)).toString('base64');
}
