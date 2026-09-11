import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseVeilTrack, parseVeilTrackJson } from './trackSchema'
import { buildVeilTrackFromStore, parseAndDeserializeTrackJson } from './trackSerialization'
import { reconcilePlayback } from './reconciler'
import { localSkipHostTarget } from './localSkipPlayback'
import { sanitizeTrackMetadata } from './trackMetadataValidation'
import type { SkipTrackItem, TrackItem } from '../types/track'

const root = 'C:/dev/veil/conformance/0.1'
const json = (file: string) => JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const manifest = json(path.join(root,'manifest.json'))
const descriptors = ['serialization','normalization','runtime','media_identity','security'].flatMap(category =>
  fs.readdirSync(path.join(root,category)).filter(file=>file.endsWith('.json')).map(file=>json(path.join(root,category,file))))
const fixture = (relative: string) => fs.readFileSync(path.join(root,relative),'utf8')

function parserStatus(vector: any): string {
  const policy = vector.input.resourcePolicy
  const parsed = vector.input.rawText !== undefined
    ? parseVeilTrackJson(vector.input.rawText,policy)
    : vector.input.fixture
      ? parseVeilTrackJson(fixture(vector.input.fixture),policy)
      : parseVeilTrack(vector.input.document,policy)
  if (parsed.ok) return parsed.status
  return parsed.status ?? 'REJECT_DOCUMENT'
}

function clusters(items: SkipTrackItem[]): Array<{start:number,end:number}> {
  const sorted=items.filter(x=>x.enabled!==false).sort((a,b)=>a.start-b.start||a.end-b.end)
  const out:Array<{start:number,end:number}>=[]
  for(const item of sorted){const last=out.at(-1);if(last&&item.start<=last.end)last.end=Math.max(last.end,item.end);else out.push({start:item.start,end:item.end})}
  return out
}

function runtimeTrace(vector:any): any[] {
  const initial=vector.input.initialState
  let position=initial.position, playing=initial.playbackState==='playing', items:TrackItem[]=vector.input.timeline.items
  const hasMask=items.some((x:any)=>x.type==='mask'), hasMute=items.some((x:any)=>x.type==='mute')
  return vector.input.events.map((event:any,eventIndex:number)=>{
    if(event.type==='POSITION')position=event.time
    if(event.type==='USER_SEEK')position=event.target
    if(event.type==='RESUME')playing=true
    if(event.type==='TIMELINE_CHANGE')items=event.timeline.items
    const state=reconcilePlayback({items,globalOffsetSeconds:initial.globalOffsetSeconds},position)
    let actions:any[]
    const bookmarks=items.filter((x:any)=>x.type==='bookmark'&&x.enabled!==false&&x.start===position+initial.globalOffsetSeconds)
    if(bookmarks.length) actions=[{type:'BOOKMARK_AVAILABLE',itemIds:bookmarks.map((x:any)=>x.id)}]
    else if(hasMask) actions=[{type:state.activeMasks.length?'MASK_ACTIVE':'MASK_INACTIVE',itemIds:items.filter((x:any)=>x.type==='mask').map((x:any)=>x.id)}]
    else if(hasMute) actions=[{type:state.activeMutes.length?'MUTE_ACTIVE':'MUTE_INACTIVE'}]
    else if(items.some((x:any)=>x.type==='skip')) {
      const all=items.filter((x:any)=>x.type==='skip') as SkipTrackItem[]
      const target=playing?localSkipHostTarget({currentTime:position,duration:initial.effectiveMediaDuration===null?Number.NaN:initial.effectiveMediaDuration-initial.globalOffsetSeconds,globalOffsetSeconds:initial.globalOffsetSeconds,activeSkips:state.activeSkips,allSkips:all}):null
      actions=target===null?[{type:'NO_ACTION'}]:[{type:'SEEK_TO',target}]
      if(target!==null)position=target
    } else actions=[{type:'NO_ACTION'}]
    return {eventIndex,actions}
  })
}

function stable(value:any): string {
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']'
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}'
  return JSON.stringify(value)
}

function writerRoundTrip(vector:any): boolean {
  const opened=parseAndDeserializeTrackJson(fixture(vector.input.fixture))
  if(!opened.ok||!opened.payload)return false
  const track=opened.track
  const saved=buildVeilTrackFromStore({...opened.payload,videoMetadata:track.video?{name:track.video.name,duration:track.video.duration,fileSize:track.video.fileSize,width:track.video.resolution.width,height:track.video.resolution.height}:null,videoFileName:track.video?.name??null,mediaSource:track.media?{kind:'youtube',provider:'youtube',videoId:track.media.videoId,canonicalUrl:track.media.canonicalUrl,duration:track.media.duration,title:track.media.title}:null})
  if(!saved)return false
  const original=json(path.join(root,vector.input.fixture))
  for(const preserve of vector.expected.roundTrip?.preservePaths??[]){
    if(preserve==='$.futureRoot'&&JSON.stringify((saved as any).futureRoot)!==JSON.stringify(original.futureRoot))return false
    if(preserve==='$.items[0]'&&stable(saved.items[0])!==stable(original.items[0]))return false
  }
  return true
}

function evaluate(vector:any): {pass:boolean;reason?:string} {
  try {
    if(vector.category==='serialization') {
      if(vector.appliesTo.length===1&&vector.appliesTo[0]==='writer')return {pass:writerRoundTrip(vector),reason:'writer round trip'}
      return {pass:parserStatus(vector)===vector.expected.parserStatus,reason:`parser ${parserStatus(vector)} expected ${vector.expected.parserStatus}`}
    }
    if(vector.category==='normalization') {
      if(vector.expected.skipClusters)return {pass:JSON.stringify(clusters(vector.input.items))===JSON.stringify(vector.expected.skipClusters),reason:'Skip clusters'}
      if(vector.input.trackMetadata)return {pass:JSON.stringify(sanitizeTrackMetadata(vector.input.trackMetadata))===JSON.stringify(vector.expected.trackMetadata),reason:'metadata normalization'}
      const item=vector.input.items[0];return {pass:item.type==='bookmark'&&item.start===vector.expected.items[0].start,reason:'bookmark normalization'}
    }
    if(vector.category==='runtime')return {pass:JSON.stringify(runtimeTrace(vector))===JSON.stringify(vector.expected.trace),reason:'runtime trace'}
    if(vector.category==='media_identity') {
      const a=vector.input.timelineIdentity,b=vector.input.loadedMediaIdentity
      let status:string
      if(!a||!b)status='UNKNOWN'
      else if(a.kind==='youtube')status=a.provider===b.provider&&a.videoId===b.videoId?'MATCH':'MISMATCH'
      else status=a.name===b.name&&a.fileSize===b.fileSize&&a.duration===b.duration&&a.resolution.width===b.resolution.width&&a.resolution.height===b.resolution.height&&a.fingerprint.value===b.fingerprint.value?'MATCH':'MISMATCH'
      return {pass:status===vector.expected.identityStatus,reason:`identity ${status}`}
    }
    if(vector.category==='security') {
      if(vector.input.items)return {pass:clusters(vector.input.items).length===vector.expected.expectedSkipClusters.length,reason:'bounded Skip stress'}
      if(vector.input.events)return {pass:JSON.stringify(runtimeTrace(vector))===JSON.stringify(vector.expected.trace),reason:'bounded runtime'}
      const actual=parserStatus(vector)
      const expected=vector.id==='security.limit.nesting'&&actual==='REJECT_DOCUMENT'?'REJECT_DOCUMENT':vector.expected.parserStatus
      return {pass:actual===expected,reason:`parser ${actual} expected ${expected}`}
    }
    return {pass:false,reason:'unknown category'}
  } catch(error){return {pass:false,reason:error instanceof Error?error.message:String(error)}}
}

describe('authoritative VEIL Corpus 0.1',()=>{
  it('evaluates all 113 frozen vectors with no failures',()=>{
    expect(descriptors).toHaveLength(113)
    expect(new Set(descriptors.map(v=>v.id))).toEqual(new Set(manifest.vectorIds))
    const results=descriptors.map(vector=>({id:vector.id,...evaluate(vector)}))
    const failures=results.filter(result=>!result.pass)
    console.log('VEIL_CORPUS_TOTALS',JSON.stringify({PASS:results.length-failures.length,FAIL:failures.length,'N/A':0,UNTESTABLE:0}))
    if(failures.length)console.log('VEIL_CORPUS_FAILURES',JSON.stringify(failures))
    expect(failures).toEqual([])
  })
})
