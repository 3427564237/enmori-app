import { readFileSync,writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import {eventBrowseApiFragment} from '../dist/src/event-browse/transport/schemas.js';
const file='api/openapi.json',moduleFile='api/event-participation.json';
const root=JSON.parse(readFileSync(file,'utf8')),feature=JSON.parse(readFileSync(moduleFile,'utf8'));
function refs(value){
  if(Array.isArray(value))return value.map(refs);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='$ref'&&typeof child==='string'&&child.startsWith('#/')?`event-participation.json${child}`:refs(child)]));
}
let changed=false;
for(const [path,item]of Object.entries(eventBrowseApiFragment.paths)){
  const operation=root.paths[path].get;
  const next={...operation,parameters:item.get.parameters??[],responses:{...operation.responses,'200':{...operation.responses['200'],content:{'application/json':{schema:item.get.responses['200'].content['application/json'].schema}}}}};
  if(!isDeepStrictEqual(operation,next))changed=true;
  root.paths[path].get=next;
}
for(const [path,item]of Object.entries(feature.paths)){
  const combined={};
  for(const [method,operation]of Object.entries(item)){
    if(!['get','put'].includes(method))continue;
    const op=refs(operation);
    op.parameters=[...(item.parameters??[]),...(op.parameters??[])];
    op['x-enmori-environment']='isolated-emulator';
    op.security=[{bearerAuth:[]}];
    for(const [status,response]of Object.entries(operation.responses)){
      const resolved=response.$ref==='#/components/responses/Error'?refs(feature.components.responses.Error):refs(response);
      op.responses[status]={...resolved,headers:{'Cache-Control':{schema:{type:'string',const:'no-store'}}}};
    }
    combined[method]=op;
  }
  if(!isDeepStrictEqual(root.paths[path],combined))changed=true;
  root.paths[path]=combined;
}
if(process.argv.includes('--check')){if(changed){console.error('EP1 OpenAPI composition is stale');process.exitCode=1;}}
else if(changed)writeFileSync(file,JSON.stringify(root,null,2)+'\n');
