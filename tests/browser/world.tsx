import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { App } from '../../src/App';
import { createInitialInventory, LOCATIONS } from '../../src/game/worldData';
const length = Number(new URLSearchParams(location.search).get('length') || 12);
const inventory = { ...createInitialInventory(), hasMeasuringTape: true, cables: [{id:'field-cable',type:'straight' as const,lengthMeters:length,createdAt:0,tested:true}] };
createRoot(document.getElementById('root')!).render(<React.StrictMode><App devFixture={{jobAccepted: new URLSearchParams(location.search).has('mission'),location:new URLSearchParams(location.search).has('base') ? 'base' : 'house',position:new URLSearchParams(location.search).has('spawn') ? LOCATIONS.house.spawn : new URLSearchParams(location.search).has('base') ? LOCATIONS.base.spawn : new URLSearchParams(location.search).has('compact') ? {x:3.7,y:4.1} : {x:3.7,y:14.1},inventory}}/></React.StrictMode>);
