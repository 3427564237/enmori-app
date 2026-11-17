import { managedCategorySchema } from '../../admin/transport/admin-routes.js';
import { eventPresentationSchema } from "../../event-detail/transport/content-schema.js";
const instant={type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?Z$"} as const;
const item={type:"object",additionalProperties:false,required:["browseId","title","startAt"],properties:{managedCategory:managedCategorySchema,...eventPresentationSchema,browseId:{type:"string",minLength:5,maxLength:174,pattern:"^(tm|pa)_[A-Za-z0-9_-]+$"},eventId:{type:"string",pattern:"^(tm|pa)_event_[0-9a-f]{64}$"},locationLabel:{type:'string',minLength:1,maxLength:200},categoryLabel:{type:'string',minLength:1,maxLength:100},title:{type:"string",minLength:1,maxLength:200},startAt:instant,endAt:instant}} as const;
export const browseBatchSchema={type:"object",additionalProperties:false,required:["asOf","scope","items"],properties:{asOf:instant,scope:{type:"string",enum:["ticketmaster_sg_first_batch_v1","singapore_events_v2"]},sourceStatus:{type:"array",items:{type:"object",required:["provider","available"],properties:{provider:{type:"string"},available:{type:"boolean"},coverageComplete:{type:"boolean"}}}},nextCursor:{type:'string',minLength:1,maxLength:512,pattern:'^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{43}$'},items:{type:"array",maxItems:40,items:item}}} as const;
export const browseDetailSchema={...item,required:[...item.required,"externalSourceUrl"],properties:{...item.properties,externalSourceUrl:{type:"string",minLength:1,maxLength:2048},locationLabel:{type:"string",minLength:1,maxLength:200},categoryLabel:{type:"string",minLength:1,maxLength:100},shortDescription:{type:"string",minLength:1,maxLength:1000},coverImageUrl:{type:"string",minLength:1,maxLength:2048,}}} as const;
/** JIN copies these two method/paths and schemas into normative OpenAPI. */
const operation = (schema: unknown) => ({
  security: [{bearerAuth: []}],
  responses: {
    "200": {description: "Minimized current source projection", content: {"application/json": {schema}}},
    ...Object.fromEntries([400,401,403,404,409,503].map(status => [String(status), {
      description: "Approved stable failure; Cache-Control: no-store",
      content: {"application/json": {schema: {$ref: "#/components/schemas/ErrorEnvelope"}}},
    }])),
  },
});
// This is a paths fragment, not a second normative OpenAPI document.
export const eventBrowseApiFragment={paths:{
  "/v1/event-browse":{get: {...operation(browseBatchSchema),parameters:[{name:'cursor',in:'query',required:false,schema:{type:'string',minLength:1,maxLength:512}}]}},
  "/v1/event-browse/{browseId}":{get: {
    ...operation(browseDetailSchema),
    parameters: [{name: "browseId", in: "path", required: true, schema: item.properties.browseId}],
  }},
}} as const;
