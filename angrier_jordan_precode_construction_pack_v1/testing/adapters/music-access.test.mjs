import test from 'node:test';import assert from 'node:assert/strict';
import {musicAccess} from '../../dist/apps/bot/src/music/music-access.js';
const guild={id:'server',ownerId:'owner'},member=(id,roles=[])=>({id,guild,user:{bot:false},roles:{cache:new Set(roles)}});
const config={get:async(_,key)=>({'roles.throne':'t','roles.chaise_lounge':'c','roles.recliner':'r','music.dj_role':'dj'}[key]??null)};
test('Music DJ follows only the explicitly configured DJ role',async()=>{assert.deepEqual(await musicAccess(guild,member('member',['dj']),config,async()=>true),{eligible:true,isDj:true});for(const [id,roles]of [['owner',[]],['member',['t']],['member',['c']],['member',['r']],['ordinary',[]]])assert.deepEqual(await musicAccess(guild,member(id,roles),config,async()=>true),{eligible:true,isDj:false});});
test('confinement denies even staff and default server role never grants DJ',async()=>{assert.deepEqual(await musicAccess(guild,member('owner'),config,async()=>false),{eligible:false,isDj:false});assert.equal((await musicAccess(guild,member('ordinary',['server']),{get:async()=> 'server'},async()=>true)).isDj,false);});
