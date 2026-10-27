const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname, '../..');
const enumValues={HOT:'HOT',NEW:'NEW',POPULAR:'POPULAR',DEFAULT:'DEFAULT'};
const zNode={};for(const k of ['trim','min','max','optional','nullable','finite','nonnegative','int','strict','partial','refine'])zNode[k]=()=>zNode;
zNode.safeParse=(data)=>({success:true,data});
const z={object:()=>zNode,string:()=>zNode,number:()=>zNode,boolean:()=>zNode,union:()=>zNode,null:()=>zNode,nativeEnum:()=>zNode};
const category={id:'65f000000000000000000001',slug:'arcade',name:'Arcade',isActive:true};
const records=[{id:'65f000000000000000000011',slug:'pinball-cashout',name:'Pinball',categoryId:category.id,category,isActive:true,gameUrl:'https://game.example',provider:'Studio',thumbnail:'/assets/games/pinball.jpg',banner:null,minBet:1,maxBet:200,status:'HOT',tag:'HOT',isFeatured:true}, {id:'65f000000000000000000012',slug:'invisible',name:'Hidden',categoryId:category.id,category,isActive:false,gameUrl:null,provider:'Studio',thumbnail:'/thumb.jpg',banner:null,minBet:1,maxBet:200,status:'HOT',tag:'HOT',isFeatured:false}];
const queries=[];
const db={
 gameCategory:{findMany:async()=>[category],findUnique:async({where})=>where.slug===category.slug?category:null,count:async()=>1},
 game:{findMany:async({where})=>{queries.push(where); if(where?.isActive) return records.filter(g=>g.isActive);return records;},findUnique:async({where})=>records.find(x=>x.slug===where.slug),findFirst:async({where})=>records.find(x=>x.slug===where.slug||where.OR?.some(y=>y.id===x.id||y.slug===x.slug)),update:async({where,data})=>{let g=records.find(x=>x.id===where.id);Object.assign(g,data);return g},count:async(args)=>args?.where?.isActive?1:2,deleteMany:()=>{throw new Error('destructive deleteMany invoked')},create:async({data})=>({...data,id:'65f000000000000000000020',category})}
};
const sends={sendSuccess:(res,data,message,statusCode=200)=>{res.statusCode=statusCode;res.json={success:true,data,message};return res},sendError:(res,message,code,statusCode=400)=>{res.statusCode=statusCode;res.json={success:false,code,message};return res}};
function load(rel,mocks){let p=path.join(root,rel),src=fs.readFileSync(p,'utf8');let js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;let module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports,require:(id)=>{if(id in mocks)return mocks[id];throw new Error('Unmocked module: '+id)},console,Date,Map,Number,Boolean,String,RegExp,Promise,Set},{filename:p});return module.exports}
let ctrl=load('BE/src/modules/games/games.controller.ts',{'@prisma/client':{GameBadge:enumValues},'zod':{z},'../../config/prisma':{prisma:db},'../../utils/response':sends});
const newRes=()=>({statusCode:200,setHeader(){}});
async function test(){
 let r=newRes();await ctrl.getGames({query:{}},r);assert.deepEqual(Array.from(r.json.data,x=>x.slug),['pinball-cashout']);assert.equal(queries[0].category.isActive,true);assert.equal(queries[0].isActive,true);
 r=newRes();await ctrl.getGames({query:{category:'nonexistent'}},r);assert.equal(r.json.data.length,0);
 r=newRes();await ctrl.getGamesStatus({},r);assert.equal(r.json.data.activeGames,1);assert.equal(r.json.data.totalGames,2);
 r=newRes();await ctrl.getGamesDiagnostics({},r);assert.ok(Array.from(r.json.data.hiddenSlugs).includes('invisible'));
 r=newRes();await ctrl.updateGame({params:{id:'pinball-cashout'},body:{name:'Pinball 2'}},r);assert.equal(r.json.success,true);assert.equal(records[0].name,'Pinball 2');
 r=newRes();await ctrl.deleteGame({params:{id:'pinball-cashout'}},r);assert.equal(r.json.success,true);assert.equal(records[0].isActive,false);
 r=newRes();await ctrl.getGameBySlug({params:{slug:'pinball-cashout'}},r);assert.equal(r.statusCode,404);
 r=newRes();await ctrl.createGame({body:{name:'No URL',categorySlug:'arcade'}},r);assert.equal(r.json.success,true);assert.equal(r.json.data.isActive,false);
 const handlers=[];const router={get:(...xs)=>handlers.push(['GET',...xs]),post:(...xs)=>handlers.push(['POST',...xs]),put:(...xs)=>handlers.push(['PUT',...xs]),patch:(...xs)=>handlers.push(['PATCH',...xs]),delete:(...xs)=>handlers.push(['DELETE',...xs])};
 const auth=()=>{};const roles=()=>{};
 load('BE/src/modules/games/games.routes.ts',{'express':{Router:()=>router},'../../middleware/auth.middleware':{authenticate:auth,requireRole:()=>roles},'../../middleware/asyncHandler':{asyncHandler:(x)=>x},'./games.controller':ctrl});
 for(const row of handlers){if(['POST','PUT','PATCH','DELETE'].includes(row[0]))assert.ok(row.includes(auth)&&row.includes(roles),row[0]+' must be admin protected')}
 const seed=fs.readFileSync(path.join(root,'BE/prisma/seed-games.ts'),'utf8');assert.ok(!seed.includes('deleteMany'));assert.ok(seed.includes('update: {}'));assert.ok(seed.includes("process.argv.includes('--apply')"));
 const old=fs.readFileSync(path.join(root,'BE/prisma/seed.ts'),'utf8');assert.ok(!old.includes('prisma.game.deleteMany({})'));assert.ok(old.includes('--demo-only'));
 console.log('PASS: catalogue live/hidden/unknown category, counts, diagnostics, slug update, soft delete, missing URL, admin guards, safe seed');
}
test().catch(e=>{console.error(e);process.exitCode=1});
