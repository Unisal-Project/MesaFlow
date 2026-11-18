import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
let server,notifications,auth;
const saved={fetch:globalThis.fetch,window:globalThis.window,localStorage:globalThis.localStorage};
const storage=new Map();
before(async()=>{
 globalThis.window={location:{protocol:'http:',hostname:'localhost'}};
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,ws:false},optimizeDeps:{noDiscovery:true}});
 notifications=await server.ssrLoadModule('/src/hooks/useAttendanceNotifications.ts');
 auth=await server.ssrLoadModule('/src/services/auth.service.ts');
});
after(async()=>{await server?.close();Object.assign(globalThis,saved);});
test('novos pedidos: sino ignora cancelados/pagos e guarda vistos, storage indisponível não quebra',()=>{
 const order={id:'9',status:'PENDING',createdAt:'2026-11-16T02:06:33Z',attendance:{status:'OPEN'},table:{number:1}};
 // Primeira visita: pedidos já existentes viram "vistos" (sem inundar o sino).
 assert.equal(notifications.newOrderNotifications([{...order,id:'8'}]).length,0);
 assert.equal(notifications.newOrderNotifications([{...order,id:'8'},order]).length,1,'pedido que chega depois notifica');
 assert.equal(notifications.newOrderNotifications([order]).length,1);
 assert.equal(notifications.newOrderNotifications([{...order,status:'CANCELLED'}]).length,0);
 assert.equal(notifications.newOrderNotifications([{...order,attendance:{status:'CLOSED'}}]).length,0);
 notifications.markOrderSeen('9');assert.equal(notifications.newOrderNotifications([order]).length,0);
 const original=globalThis.localStorage;
 globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.doesNotThrow(()=>notifications.markOrderSeen('10'));
 assert.equal(notifications.newOrderNotifications([{...order,id:'10'}]).length,0);
 globalThis.localStorage=original;
});
test('perfil atualiza sessão preservando token sem logout',async()=>{
 const accessToken='header.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.sig';
 storage.set('mesaflow.session',JSON.stringify({accessToken,user:{id:'1',name:'Ana',email:'ana@example.com',role:'ADMIN'}}));
 let request;
 globalThis.fetch=async(_url,options)=>{request=options;return Response.json({id:'1',name:'Ana Nova',email:'ana@example.com',role:'ADMIN'});};
 await auth.updateProfile({name:'Ana Nova'});
 assert.equal(request.method,'PATCH');assert.deepEqual(JSON.parse(request.body),{name:'Ana Nova'});
 assert.equal(auth.getSession().accessToken,accessToken);assert.equal(auth.getSession().user.name,'Ana Nova');
});

test('vistos não atravessam usuários no mesmo navegador',()=>{
 const token='h.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.s';
 storage.set('mesaflow.session',JSON.stringify({accessToken:token,user:{id:'another',role:'ADMIN'}}));
 notifications.newOrderNotifications([]); // primeira visita deste usuário: nada existente
 assert.equal(notifications.newOrderNotifications([{id:'9',status:'PENDING',attendance:{status:'OPEN'},table:{number:1}}]).length,1);
});

test('semente marca também pedidos de contas fechadas: reabrir não vira "pedido novo"', () => {
 const token = 'h.' + btoa(JSON.stringify({exp: Math.floor(Date.now()/1000)+3600})) + '.s';
 storage.set('mesaflow.session', JSON.stringify({accessToken: token, user: {id: 'reopen-user', role: 'ADMIN'}}));
 const closed = {id: '70', status: 'PENDING', createdAt: '2026-11-16T01:00:00Z', attendance: {status: 'CLOSED'}, table: {number: 2}};
 assert.equal(notifications.newOrderNotifications([closed]).length, 0); // primeira visita: semente
 assert.equal(notifications.newOrderNotifications([{...closed, attendance: {status: 'OPEN'}}]).length, 0, 'conta reaberta não notifica pedido antigo');
 assert.equal(notifications.newOrderNotifications([{...closed, attendance: {status: 'OPEN'}}, {...closed, id: '71', attendance: {status: 'OPEN'}}]).length, 1, 'pedido realmente novo notifica');
});

test('sem localStorage: o primeiro pedido novo após a semente vazia notifica', () => {
 const original = globalThis.localStorage;
 const token = 'h.' + btoa(JSON.stringify({exp: Math.floor(Date.now()/1000)+3600})) + '.s';
 storage.set('mesaflow.session', JSON.stringify({accessToken: token, user: {id: 'private-user', role: 'ADMIN'}}));
 const session = storage.get('mesaflow.session');
 globalThis.localStorage = {getItem: (k) => { if (k === 'mesaflow.session') return session; throw Error('blocked'); }, setItem() { throw Error('blocked'); }};
 try {
  assert.equal(notifications.newOrderNotifications([]).length, 0); // semente vazia
  assert.equal(notifications.newOrderNotifications([{id: '80', status: 'PENDING', attendance: {status: 'OPEN'}, table: {number: 1}}]).length, 1);
 } finally { globalThis.localStorage = original; }
});

test('B11: reabrir conta antiga em outro aparelho não vira "pedido novo" (anterior a ontem)',()=>{
 storage.set('mesaflow.session',JSON.stringify({accessToken:'h.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.s',user:{id:'reopen-user',role:'ADMIN'}}));
 notifications.newOrderNotifications([]); // primeira visita (semente vazia)
 const today=new Date().toISOString().slice(0,10);
 const old={id:'900',status:'PENDING',businessDate:'2020-01-01',attendance:{status:'OPEN'},table:{number:1}};
 const recent={id:'901',status:'PENDING',businessDate:today,attendance:{status:'OPEN'},table:{number:2}};
 const result=notifications.newOrderNotifications([old,recent]);
 assert.deepEqual(result.map(o=>o.id),['901']);
});
