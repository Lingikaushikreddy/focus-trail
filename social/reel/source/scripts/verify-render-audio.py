"""Verify that the encoded Reel contains the declared local narration/SFX mix.
Run from the editable project's root with Python 3 and FFmpeg on PATH.
"""
from pathlib import Path
import array,hashlib,json,math,re,subprocess
p=Path.cwd();rate=16000;duration=20;length=rate*duration

def decode(f):
    r=subprocess.run(['ffmpeg','-v','error','-i',str(f),'-ac','1','-ar',str(rate),'-f','f32le','pipe:1'],check=True,capture_output=True)
    a=array.array('f');a.frombytes(r.stdout);return a

expected=array.array('f',[0.0])*length
tracks=[]
for tag in re.findall(r'<audio\b[^>]*>',(p/'index.html').read_text()):
    a=dict(re.findall(r'([\w-]+)="([^"]*)"',tag));start=float(a['data-start']);seconds=float(a['data-duration']);gain=float(a.get('data-volume',1));wave=decode(p/a['src']);offset=round(start*rate);count=min(len(wave),round(seconds*rate),length-offset)
    for n in range(count):expected[offset+n]+=wave[n]*gain
    tracks.append({'id':a['id'],'source':a['src'],'start':start,'duration':seconds,'volume':gain})
assert len(tracks)==13,len(tracks)
actual=decode(p/'renders/focus-trail-instagram-reel.mp4');assert len(actual)>=length-16

def match(start,end):
    lo=max(0,round(start*rate));hi=min(len(actual),round(end*rate));x=expected[lo:hi];y=actual[lo:hi]
    xx=sum(v*v for v in x);yy=sum(v*v for v in y);xy=sum(a*b for a,b in zip(x,y));assert xx>1e-6 and yy>1e-6
    scale=xy/xx;corr=xy/math.sqrt(xx*yy);error=math.sqrt(sum((b-scale*a)**2 for a,b in zip(x,y))/yy)
    return {'correlation':round(corr,6),'fitted_gain':round(scale,6),'normalized_error':round(error,6)}

cues=json.loads((p/'narration-cues.json').read_text())['cues'];results=[]
for c in cues:
    m=match(c['start'],c['start']+c['duration']);results.append({'id':c['id'],'start':c['start'],'end':round(c['start']+c['duration'],4),**m})
report={'method':'Independent reconstruction of 13 declared local audio tracks at their authored starts and gains; compare FFmpeg-decoded mono PCM to the final AAC mix. Fitted gain accounts for downmix conventions.','comparison_sample_rate':rate,'declared_tracks':tracks,'voice_segments':results,'whole_mix':match(0,20),'threshold':{'minimum_correlation':.97},'passed':all(r['correlation']>=.97 for r in results),'limits':['This proves encoded source inclusion and timing, not independent speech recognition or subjective voice quality.','TTS word timings are model estimates, not ASR.']}
(p/'evidence/audio-match.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':report['passed'],'voice_segments':results,'whole_mix':report['whole_mix']},indent=2));assert report['passed']
