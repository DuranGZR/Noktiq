import { useEffect, useRef, useState } from 'react';
import { Noktiq } from 'noktiq/react';
import { Dialog as MuiDialog, DialogTitle, DialogContent, Button, Menu, MenuItem } from '@mui/material';
import * as Radix from './registry/radix-nova/ui/dialog';
import * as Base from './registry/base-nova/ui/dialog';
import * as RadixMenu from './registry/radix-nova/ui/dropdown-menu';
import * as BaseMenu from './registry/base-nova/ui/dropdown-menu';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import './style.css';

ModuleRegistry.registerModules([AllCommunityModule]);
const records = Array.from({length:20000},(_,index)=>({id:`record-${index}`,name:'Repeated row'}));

function VirtualTable() {
  const parent=useRef<HTMLDivElement>(null);
  const table=useReactTable({data:records,columns:[{accessorKey:'name'}],getCoreRowModel:getCoreRowModel(),getRowId:row=>row.id});
  const rows=table.getRowModel().rows;
  const virtual=useVirtualizer({count:rows.length,getScrollElement:()=>parent.current,estimateSize:()=>36,overscan:3,getItemKey:index=>rows[index].id});
  return <section><h2>TanStack virtual table</h2><div id="virtual-scroll" ref={parent} style={{height:260,overflow:'auto'}}>
    <div style={{height:virtual.getTotalSize(),position:'relative'}}>{virtual.getVirtualItems().map(item=><div key={item.key} data-row-id={rows[item.index].id} style={{position:'absolute',top:item.start,height:36,width:'100%'}}><button data-cell="virtual">{rows[item.index].original.name}</button></div>)}</div>
  </div></section>;
}

function Playground() {
  const [mui,setMui]=useState(false),[anchor,setAnchor]=useState<HTMLElement|null>(null);
  return <main onClick={()=>{(window as any).applicationClicks=((window as any).applicationClicks||0)+1}}><h1>React UI ecosystem</h1>
    <Radix.Dialog><Radix.DialogTrigger id="open-radix">Open Radix dialog</Radix.DialogTrigger><Radix.DialogContent className="fixture-dialog"><Radix.DialogTitle>Radix dialog</Radix.DialogTitle><Radix.DialogDescription>Original shadcn registry component.</Radix.DialogDescription><button id="radix-target">Radix target</button><Radix.DialogClose id="close-radix">Close Radix</Radix.DialogClose></Radix.DialogContent></Radix.Dialog>
    <Base.Dialog><Base.DialogTrigger id="open-base">Open Base dialog</Base.DialogTrigger><Base.DialogContent className="fixture-dialog"><Base.DialogTitle>Base dialog</Base.DialogTitle><Base.DialogDescription>Original shadcn registry component.</Base.DialogDescription><button id="base-target">Base target</button><Base.DialogClose id="close-base">Close Base</Base.DialogClose></Base.DialogContent></Base.Dialog>
    <Button id="open-mui" onClick={()=>setMui(true)}>Open MUI dialog</Button><MuiDialog keepMounted open={mui} onClose={()=>setMui(false)}><DialogTitle>MUI dialog</DialogTitle><DialogContent><button id="mui-target">MUI target</button><Button id="mui-generated">MUI generated button</Button><button id="close-mui" onClick={()=>setMui(false)}>Close MUI</button></DialogContent></MuiDialog>
    <RadixMenu.DropdownMenu><RadixMenu.DropdownMenuTrigger id="open-radix-menu">Open Radix menu</RadixMenu.DropdownMenuTrigger><RadixMenu.DropdownMenuContent className="fixture-menu"><RadixMenu.DropdownMenuItem><span id="radix-menu-target">Radix menu target</span></RadixMenu.DropdownMenuItem></RadixMenu.DropdownMenuContent></RadixMenu.DropdownMenu>
    <BaseMenu.DropdownMenu><BaseMenu.DropdownMenuTrigger id="open-base-menu">Open Base menu</BaseMenu.DropdownMenuTrigger><BaseMenu.DropdownMenuContent className="fixture-menu"><BaseMenu.DropdownMenuItem><span id="base-menu-target">Base menu target</span></BaseMenu.DropdownMenuItem></BaseMenu.DropdownMenuContent></BaseMenu.DropdownMenu>
    <Button id="open-mui-menu" onClick={event=>setAnchor(event.currentTarget)}>Open MUI menu</Button><Menu anchorEl={anchor} open={!!anchor} onClose={()=>setAnchor(null)}><MenuItem><span id="mui-menu-target">MUI menu target</span></MenuItem></Menu>
    <button id="normal-target">Normal target</button><VirtualTable/>
    <section><h2>AG Grid</h2><div id="ag-table" style={{height:300}}><AgGridReact rowData={records} columnDefs={[{field:'name',colId:'name',width:300}]} getRowId={params=>params.data.id} onGridReady={event=>{(window as any).gridApi=event.api}} /></div></section>
  </main>;
}

function RouterPage() {
  const {slug}=useParams(),navigate=useNavigate();
  useEffect(()=>{(window as any).ecosystemNavigate=(to:string)=>navigate(to)},[navigate]);
  return <main><h1>React Router {slug}</h1><button id="route-target">Route {slug}</button><Link id="route-next" to={slug==='a'?'/router/b':'/router/a'}>Next route</Link></main>;
}
const rootRoute=createRootRoute({component:()=> <Outlet/>});
const routeA=createRoute({getParentRoute:()=>rootRoute,path:'/tanstack/a',component:()=> <main><button id="route-target">Route a</button></main>});
const routeB=createRoute({getParentRoute:()=>rootRoute,path:'/tanstack/b',component:()=> <main><button id="route-target">Route b</button></main>});
const tanstack=createRouter({routeTree:rootRoute.addChildren([routeA,routeB])});

export default function App() {
  if(location.pathname.startsWith('/tanstack')) {
    (window as any).ecosystemNavigate=(to:string)=>tanstack.navigate({to});
    return <><RouterProvider router={tanstack}/><Noktiq enabled={import.meta.env.DEV}/></>;
  }
  return <BrowserRouter><Routes><Route path="/router/:slug" element={<RouterPage/>}/><Route path="*" element={<Playground/>}/></Routes><Noktiq enabled={import.meta.env.DEV}/></BrowserRouter>;
}
