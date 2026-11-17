import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router';
let server, Products, AdminRoutes, AdminSidebar, paths, run;
const old = { window: globalThis.window, localStorage: globalThis.localStorage };
before(async () => {
  globalThis.window = { location: { protocol: 'http:', hostname: 'localhost' } };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true }, plugins: [{ name:'unified-menu-hooks', enforce:'pre', transform(code,id) {
    if (id.endsWith('/Promotions/hooks/usePromotions.ts')) return 'export const usePromotions = () => globalThis.menuPromotionState;';
    if (id.endsWith('/Products/index.tsx') || id.endsWith('/hooks/useContentTransition.ts') || id.endsWith('/hooks/usePagedList.ts')) return code.replace('from "react"','from "/tests/helpers/hook-runtime.mjs"');
  } }] });
  ({ createHookRunner:run } = await server.ssrLoadModule('/tests/helpers/hook-runtime.mjs'));
  ({ default:Products } = await server.ssrLoadModule('/src/pages/admin/Products/index.tsx'));
  ({ AdminRoutes } = await server.ssrLoadModule('/src/routers/AdminRoutes.tsx'));
  ({ AdminSidebar } = await server.ssrLoadModule('/src/components/layout/AdminSidebar.tsx'));
  paths = await server.ssrLoadModule('/src/routers/paths.ts');
});
after(async () => { await server?.close(); Object.assign(globalThis,old); delete globalThis.menuPromotionState; });
function find(tree, test) { if (Array.isArray(tree)) return tree.map(n=>find(n,test)).find(Boolean); if (!tree?.props) return undefined; return test(tree) ? tree : find(tree.props.children,test); }
function promotionState() { return { products:[],categories:[],selected:[],loading:true,form:{},feedbackRef:{current:null},defineFor(){},reload(){},clearSelection(){},busy:false }; }
function props() {
 const products=[{id:'1',name:'Suco',categoryId:'c',price:'10',quantity:2},{id:'2',name:'Água',categoryId:'c',price:'5',quantity:2}];
 return { onNavigate(){}, productState:{products,filteredProducts:products,normalizedSearch:'',searchQuery:'',categoryFilter:'all',availabilityFilter:'all',sortOrder:'default',loading:false},categoryState:{categories:[{id:'c',name:'Bebidas'}]}, activeTab:'products',showAllProducts:false,showAllCategories:false,onSwitchTab(){},onShowAllProducts(){},onShowAllCategories(){},onBackToMenu(){} };
}
test('menu lateral não expõe Promoções nem Ver cardápio',()=>{
 const html=renderToString(createElement(AdminSidebar,{activeId:'menu',onChange(){}}));
 assert.ok(!html.includes('<span>Promoções</span>')); assert.ok(!html.includes('<span>Ver cardápio</span>'));
});
test('cardápio tem prévia com origem e abas; seleção abre painel compartilhado',()=>{
 globalThis.menuPromotionState=promotionState(); const calls=[];const tabs=[];const navigation=[];
 globalThis.menuPromotionState.defineFor=keys=>calls.push(keys);
 const current=props(); current.onSwitchTab=tab=>tabs.push(tab); current.onNavigate=id=>navigation.push(id);
 const render=run(()=>Products(current));
 find(render(),n=>n.props?.children?.some?.(c=>c==='Ver cardápio')).props.onClick();
 // "Ver cardápio" abre o pop-up de acesso (QR + abrir no computador), sem navegar (fa604b0).
 assert.deepEqual(navigation,[]); assert.ok(find(render(),n=>n.type?.name==='MenuAccessModal'));
 find(render(),n=>n.props?.['aria-label']==='Selecionar Suco').props.onChange();
 find(render(),n=>n.props?.['aria-label']==='Selecionar Água').props.onChange();
 find(render(),n=>n.props?.children==='Colocar em promoção').props.onClick();
 assert.deepEqual(calls,[['p:1','p:2']]); assert.equal(tabs.at(-1),'promotions');
});
test('aba Promoções embute conteúdo sem sidebar/topbar próprios',()=>{
 globalThis.menuPromotionState=promotionState(); const current=props();current.activeTab='promotions';
 const tree=run(()=>Products(current))();const content=find(tree,n=>n.props?.embedded);
 assert.ok(content); assert.equal(content.props.state,globalThis.menuPromotionState);
});


test('atalho da categoria seleciona c: e conteúdo embutido não duplica o shell', async()=>{
 globalThis.menuPromotionState=promotionState();const calls=[];globalThis.menuPromotionState.defineFor=keys=>calls.push(keys);
 const current=props();current.activeTab='categories';const tabs=[];current.onSwitchTab=tab=>tabs.push(tab);
 const tree=run(()=>Products(current))();find(tree,n=>n.props?.onPromote).props.onPromote(['c']);
 assert.deepEqual(calls,[['c:c']]);assert.equal(tabs.at(-1),'promotions');
 const { CategoryRow }=await server.ssrLoadModule('/src/pages/admin/Categories/components/CategoryRow.tsx');
 let chosen;const row=CategoryRow({category:{id:'c',name:'Bebidas'},onPromote:id=>chosen=id});
 find(row,n=>n.props?.['aria-label']==='Promoção de Bebidas').props.onClick();assert.equal(chosen,'c');
 const { PromotionsContent }=await server.ssrLoadModule('/src/pages/admin/Promotions/index.tsx');
 const html=renderToString(createElement(PromotionsContent,{embedded:true,state:promotionState(),onNavigate(){}}));
 assert.ok(!html.includes('admin-sidebar'));assert.ok(!html.includes('promotions-topbar'));assert.ok(html.includes('<h2>Promoções</h2>'));
});

test('rota integrada renderiza um único shell e o legado redireciona',()=>{
 globalThis.menuPromotionState=promotionState();
 const renderAt=path=>run(()=>renderToString(createElement(MemoryRouter,{initialEntries:[path]},createElement(Routes,null,createElement(Route,{path:'/admin/*',element:createElement(AdminRoutes)})))))();
 const html=renderAt('/admin/cardapio/promocoes');
 assert.equal((html.match(/class="admin-sidebar"/g)??[]).length,1);
 assert.ok(!html.includes('promotions-topbar'));assert.ok(html.includes('<h2>Promoções</h2>'));
 assert.equal(renderAt('/admin/promocoes'),'');
});

test('lista de produtos pagina em 25/50/100/todos em vez de cortar em 4', () => {
 globalThis.menuPromotionState = promotionState();
 const current = props();
 const many = Array.from({ length: 120 }, (_, i) => ({ id: String(i), name: `P${i}`, categoryId: 'c', price: '1', quantity: 1 }));
 Object.assign(current.productState, { products: many, filteredProducts: many });
 const render = run(() => Products(current));
 const rows = tree => (find(tree, n => n.props?.className === 'products-list-body').props.children[0]).length;
 let tree = render();
 assert.equal(rows(tree), 25);
 const pager = () => find(render(), n => n.type?.name === 'ListPager').props;
 assert.equal(pager().totalPages, 5);
 pager().onPage(5); assert.equal(rows(render()), 20);
 pager().onPageSize(100); assert.equal(pager().page, 1); assert.equal(rows(render()), 100);
 pager().onPageSize(999); assert.equal(rows(render()), 120); assert.equal(pager().totalPages, 1); assert.equal(pager().last, 120);
});

test('paginação compacta: 1 2 3 4 5 … 26 e janela no meio/fim', async () => {
 const { pageItems } = await server.ssrLoadModule('/src/utils/pagination.ts');
 assert.deepEqual(pageItems(1, 5), [1, 2, 3, 4, 5]);
 assert.deepEqual(pageItems(1, 26), [1, 2, 3, 4, 5, '…', 26]);
 assert.deepEqual(pageItems(10, 26), [1, '…', 9, 10, 11, '…', 26]);
 assert.deepEqual(pageItems(26, 26), [1, '…', 22, 23, 24, 25, 26]);
});
