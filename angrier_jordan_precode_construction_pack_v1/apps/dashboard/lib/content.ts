import { getPrismaClient } from '../../../packages/database/src/client';

export type ContentGroup={game:string;enabled:number;disabled:number};

export async function readContentGroups():Promise<ContentGroup[]>{
  const rows=await getPrismaClient().contentEntry.groupBy({by:['game','enabled'],_count:{_all:true},orderBy:{game:'asc'}});
  const grouped=new Map<string,ContentGroup>();
  for(const row of rows){const current=grouped.get(row.game)??{game:row.game,enabled:0,disabled:0};if(row.enabled)current.enabled=row._count._all;else current.disabled=row._count._all;grouped.set(row.game,current);}
  return [...grouped.values()];
}
