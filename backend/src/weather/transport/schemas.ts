import { weatherConditions } from "../domain/weather.js";
export const positionSchema = {
  type:"object",additionalProperties:false,required:["latitude","longitude"],
  properties:{latitude:{type:"number",minimum:-90,maximum:90},longitude:{type:"number",minimum:-180,maximum:180}},
} as const;
export const weatherRequestSchema = {
  type:"object",additionalProperties:false,required:["position","expectedSettingsRevision"],
  properties:{position:{type:"object",additionalProperties:false,required:["latitude","longitude"],
    properties:{latitude:{type:"number"},longitude:{type:"number"}}},
    expectedSettingsRevision:{type:"integer",minimum:0,maximum:Number.MAX_SAFE_INTEGER}},
} as const;
export const weatherProjectionSchema = {
  type:"object",additionalProperties:false,
  required:["projectionVersion","source","observedAt","temperatureCelsius","condition"],
  properties:{projectionVersion:{const:"weather_projection_v1"},source:{const:"open_meteo"},
    observedAt:{type:"string"},temperatureCelsius:{type:"number",minimum:-100,maximum:70},condition:{type:"string",enum:weatherConditions}},
} as const;
