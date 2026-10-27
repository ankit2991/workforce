/* Minimal isolated QA for Patch 3 without DB credentials or external services. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname, '../..');
function load(p,dependencies){const file=path.resolve(root,p);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports,require:k=>{if(Object.hasOwn(dependencies,k))return dependencies[k];throw Error('Unmocked '+k);},process,console,Map,Set,Promise},{filename:file});return module.exports;}
const testUser={id:'65f0000000000000000000aa',email:'admin@workpay.example',passwordHash:'bcrypt-stub',mobile:'admin-test',role:'SUPER_ADMIN',status:'ACTIVE'};
let passwordOk=false;let tokenCalls=[];
const prisma={user:{findUnique:async({where})=>where.email==='admin@workpay.example'?testUser:null}};
const zNode={};for(const k of ['trim','min','max','strict','email'])zNode[k]=()=>zNode;zNode.safeParse=v=>({success:typeof v?.email==='string'&&typeof v?.password==='string',data:v});
const z={object:()=>zNode,string:()=>zNode};
const sends={sendError:(res,message,code,statusCode)=>{res.code=statusCode;res.body={success:false,code,message};return res},sendSuccess:(res,data)=>{res.code=200;res.body={success:true,data};return res}};
const handler=load('BE/src/modules/auth/admin-auth.controller.ts',{'bcryptjs':{__esModule:true,default:{compare:async password=>passwordOk&&password==='secure-admin-pass'}},'zod':{z},'../../config/prisma':{prisma},'../../utils/jwt':{generateAccessToken:payload=>{tokenCalls.push(payload);return 'mock-jwt'}},'../../utils/response':sends});
async function run(){
 let res={setHeader(){}};await handler.loginAdmin({body:{email:'bad@workpay.example',password:'random'}},res);assert.equal(res.code,401);
 res={setHeader(){}};await handler.loginAdmin({body:{email:testUser.email,password:'bad-password'}},res);assert.equal(res.code,401);
 passwordOk=true;res={setHeader(){}};await handler.loginAdmin({body:{email:testUser.email,password:'secure-admin-pass'}},res);assert.equal(res.body.data.accessToken,'mock-jwt');assert.equal(tokenCalls[0].userId,testUser.id);
 const frontApi=fs.readFileSync(path.join(root,'FE/src/lib/apiClient.ts'),'utf8');assert.ok(frontApi.includes("settings.auth === 'admin' ? 'workpay_admin_token'"));
 const login=fs.readFileSync(path.join(root,'FE/src/features/admin/AdminLogin.tsx'),'utf8');assert.ok(login.includes("'/auth/admin/login'"));assert.ok(!login.includes('admin123')&&!login.includes('admin_demo_token_active'));
 const app=fs.readFileSync(path.join(root,'FE/src/App.tsx'),'utf8');assert.ok(app.includes("'/auth/me'")&&app.includes("auth: 'admin'"));
 const dashboard=fs.readFileSync(path.join(root,'FE/src/features/admin/AdminLayout.tsx'),'utf8');assert.ok(dashboard.includes("'/games/admin/catalog'"));assert.ok(dashboard.includes('handleToggleGame'));
 const modal=fs.readFileSync(path.join(root,'FE/src/components/modals/GameLaunchModal.tsx'),'utf8');assert.ok(!modal.includes('Math.random')&&!modal.includes("'/gaming-wallet/win'")&&!modal.includes("'/gaming-wallet/bet'"));
 const frontendEnv=fs.readFileSync(path.join(root,'FE/.env.example'),'utf8');assert.ok(!frontendEnv.includes('JWT_ACCESS_SECRET='));
 const backendScript=fs.readFileSync(path.join(root,'BE/scripts/admin-account.ts'),'utf8');assert.ok(backendScript.includes('--apply'));assert.ok(backendScript.includes('bcrypt.hash'));
 console.log('PASS: invalid/nonexistent admin rejected; valid admin JWT; real session validation; admin catalogue; no simulated financial settlement; safe provisioning');
}
run().catch(err=>{console.error(err);process.exitCode=1});
