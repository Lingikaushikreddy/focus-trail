#!/usr/bin/env python3
"""Verify encoded voice timing, non-silent music, authored carve and delivery levels.
Run in the project root with Python 3 + NumPy and FFmpeg/FFprobe on PATH.
This intentionally does NOT reconstruct HyperFrames' processed music stem.
"""
from pathlib import Path
from html.parser import HTMLParser
import argparse, hashlib, json, math, subprocess
import numpy as np

RATE=16000
class Tracks(HTMLParser):
    def __init__(self): super().__init__(); self.audio=[]
    def handle_starttag(self,tag,attrs):
        if tag=='audio': self.audio.append(dict(attrs))

def decode(path,channels=1):
    r=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-ac',str(channels),'-ar',str(RATE),'-f','f32le','pipe:1'],capture_output=True,check=True)
    return np.frombuffer(r.stdout,dtype='<f4').astype(np.float64).reshape(-1,channels)
def db(value): return float(20*np.log10(max(float(value),1e-12)))
def rms(x): return float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0
def projection(x,y):
    count=min(len(x),len(y)); x=x[:count]; y=y[:count]
    xx=float(x@x); yy=float(y@y); xy=float(x@y)
    gain=xy/max(xx,1e-20); fitted=x*gain; residual=y-fitted
    return {'correlation':float(xy/math.sqrt(max(xx*yy,1e-30))), 'fitted_gain':gain,
            'source_rms_dbfs':db(rms(x)), 'actual_rms_dbfs':db(rms(y)),
            'mixed_residual_rms_dbfs':db(rms(residual)),
            'projected_voice_to_mixed_residual_db':db(rms(fitted)/max(rms(residual),1e-12))}

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--render',default='renders/focus-trail-instagram-reel.mp4')
args=parser.parse_args(); p=Path.cwd(); evidence=p/'evidence'; evidence.mkdir(exist_ok=True)
html=(p/'index.html').read_text(); parsed=Tracks(); parsed.feed(html); tracks=parsed.audio
voice=[a for a in tracks if a.get('src')=='assets/voice/narration.wav']
bed=[a for a in tracks if a.get('src')=='assets/music/focus-trail-bed.wav']
sfx=[a for a in tracks if a.get('id','').startswith('key-tap-')]
assert len(voice)==1 and len(bed)==1, 'Expected one narration and one music bed'
v,b=voice[0],bed[0]
render=p/args.render; actual_stereo=decode(render,2); actual=actual_stereo.mean(axis=1)
source=decode(p/v['src']).ravel(); start=float(v['data-start']); declared_duration=float(v['data-duration'])
full_source_duration=len(source)/RATE
source=source[:round(declared_duration*RATE)]
# Match the actual unprocessed narrator waveform over +/-80 ms. FFT correlation
# supplies numerator; cumulative actual energy gives normalized candidate scores.
nfft=1 << ((len(actual)+len(source)-1).bit_length())
cross=np.fft.irfft(np.fft.rfft(actual,nfft)*np.conj(np.fft.rfft(source,nfft)),nfft)
centre=round(start*RATE); max_lag=round(.080*RATE)
positions=np.arange(max(0,centre-max_lag),min(len(actual)-len(source),centre+max_lag)+1)
cumulative=np.r_[0,np.cumsum(actual**2)]
y_energy=cumulative[positions+len(source)]-cumulative[positions]
correlations=cross[positions]/np.sqrt(np.maximum(float(source@source)*y_energy,1e-30))
best=int(positions[int(np.argmax(correlations))]); lag=(best-centre)/RATE
whole=projection(source,actual[best:best+len(source)])
windows=[]
for offset in np.arange(0,len(source)/RATE,2.0):
    lo=round(offset*RATE); hi=min(len(source),lo+2*RATE)
    if hi-lo < RATE*.6 or db(rms(source[lo:hi])) < -38: continue
    stats=projection(source[lo:hi],actual[best+lo:best+hi])
    windows.append({'source_start':float(offset),'source_end':hi/RATE,**stats})
assert windows, 'No active narration windows'
# Voice is mono. During intervals with no authored key effect, side-channel
# energy is supporting evidence that stereo music survived under the voice.
# It is not a processed stem or proof of subjective balance.
side=(actual_stereo[:,0]-actual_stereo[:,1])/2
original_music=decode(p/b['src'],2)
original_music_side=(original_music[:,0]-original_music[:,1])/2
music_start=float(b['data-start']); music_media_start=float(b.get('data-media-start',0))
side_intervals=[]
for offset in np.arange(.5,min(len(source)/RATE-.5,17.5),.5):
    t=start+float(offset); end=t+.4
    if any(t<float(a['data-start'])+float(a['data-duration'])+.25 and end>float(a['data-start'])-.05 for a in sfx): continue
    if db(rms(source[round(offset*RATE):round((offset+.4)*RATE)])) < -35: continue
    actual_side=side[round(t*RATE):round(end*RATE)]
    source_lo=round((t-music_start+music_media_start)*RATE)
    source_side=original_music_side[source_lo:source_lo+len(actual_side)]
    music_identity=projection(source_side,actual_side)
    side_intervals.append({'start':t,'end':end,'side_rms_dbfs':db(rms(actual_side)),
                           'original_music_side_rms_dbfs':db(rms(source_side)),
                           'original_music_side_correlation':music_identity['correlation']})
# After the entire declared narration and all SFX end, only the bed is authored.
# Avoid the final fade and leave a 250 ms safety margin beyond the voice.
last_voice_end=start+len(source)/RATE
outro_start=max(last_voice_end+.25,18.55); outro_end=19.2
assert outro_end-outro_start>=.3, 'Need >=300 ms of music-only outro before ending fade'
outro=actual[round(outro_start*RATE):round(outro_end*RATE)]
outro_side=side[round(outro_start*RATE):round(outro_end*RATE)]
carve=json.loads(b.get('data-fx-carve','{}'))
chain=json.loads(b.get('data-fx-chain','{}'))
automation=json.loads(b.get('data-automation','{}'))
nodes=chain.get('nodes',[]); node_map={n.get('id'):n for n in nodes}
lanes=automation.get('lanes',[])
valid_targets=True; changing_lanes=[]
for lane in lanes:
    target=lane.get('target',''); points=lane.get('points',[])
    valid=target=='volume'
    if target.startswith('fx.'):
        parts=target.split('.'); valid=len(parts)==3 and parts[1] in node_map and parts[2] in node_map[parts[1]].get('params',{})
    valid_targets &= valid
    values=[float(q['v']) for q in points]
    if values and max(values)-min(values)>.001: changing_lanes.append(target)
carved_peaks=[n for n in nodes if n.get('type')=='peaking' and n.get('fromCarve') and n.get('enabled',True)]
carved_gain=[n for n in nodes if n.get('type')=='gain' and n.get('fromCarve') and n.get('enabled',True)]
# AAC delivery measurements on the actual rendered file, not the source WAV.
loud=subprocess.run(['ffmpeg','-hide_banner','-i',str(render),'-af','loudnorm=I=-16:TP=-1:LRA=7:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
(evidence/'final-mix-loudness.log').write_text(loud.stderr)
lo=loud.stderr.rfind('{'); hi=loud.stderr.find('}',lo)
levels=json.loads(loud.stderr[lo:hi+1]); integrated=float(levels['input_i']); true_peak=float(levels['input_tp'])
(evidence/'final-mix-loudness.json').write_text(json.dumps({'measurement':'Actual final AAC mix, FFmpeg loudnorm input measurements',**levels},indent=2)+'\n')
median_corr=float(np.median([w['correlation'] for w in windows])); p10_corr=float(np.percentile([w['correlation'] for w in windows],10))
median_ratio=float(np.median([w['projected_voice_to_mixed_residual_db'] for w in windows]))
median_side=float(np.median([w['side_rms_dbfs'] for w in side_intervals])) if side_intervals else -240
median_music_identity=float(np.median([w['original_music_side_correlation'] for w in side_intervals])) if side_intervals else 0
matching_music_fraction=float(np.mean([w['original_music_side_correlation']>=.5 for w in side_intervals])) if side_intervals else 0
cues=json.loads((p/'narration-cues.json').read_text())
checks={
 'ten_authored_audio_tracks':len(tracks)==10,
 'eight_quiet_key_effects':len(sfx)==8 and all(float(a.get('data-volume',1))<=.15 for a in sfx),
 'one_continuous_narration_track':len(voice)==1 and len(cues['cues'])==1 and cues['cues'][0]['id']=='narration' and cues.get('synthesis',{}).get('resultChunks')==1,
 'narration_starts_at_150ms':abs(start-.15)<.0001,
 'source_duration_matches_declared':abs(full_source_duration-declared_duration)<.002,
 'source_hash_matches_cue_record':hashlib.sha256((p/v['src']).read_bytes()).hexdigest()==cues['cues'][0]['sha256'],
 'encoded_audio_covers_20_seconds':len(actual)/RATE>=19.99,
 'narration_timing_within_25ms':abs(lag)<=.025,
 'dominant_voice_matches_source':whole['correlation']>=.90 and median_corr>=.90 and p10_corr>=.80,
 'voice_dominates_mixed_residual':median_ratio>=8,
 'stereo_music_survives_under_voice':len(side_intervals)>=5 and median_side>-60,
 'stereo_under_voice_matches_original_music':median_music_identity>=.70 and matching_music_fraction>=.80,
 'music_only_outro_is_non_silent':db(rms(outro))>-50 and db(rms(outro_side))>-62,
 'carve_targets_only_narration':carve.get('enabled',True) and carve.get('sources')==['narration'] and abs(float(carve.get('strength',-1))-.65)<.0001,
 'canonical_carve_nodes_present':len(carved_peaks)>=1 and len(carved_gain)==1,
 'carve_automation_resolves_and_changes':valid_targets and len(changing_lanes)>=2,
 'social_delivery_loudness_range':-20<=integrated<=-13,
 'delivery_peak_headroom':true_peak<=-1.0,
}
report={
 'method':'Compare the unchanged mono narration source with the encoded AAC mix using normalized lag correlation and windowed least-squares projections; inspect encoded stereo music evidence in SFX-free speech windows and a music-only outro; inspect authored canonical carve; measure final AAC loudness/true peak.',
 'comparison_sample_rate':RATE,
 'render':{'path':args.render,'sha256':hashlib.sha256(render.read_bytes()).hexdigest(),'decoded_duration':len(actual)/RATE},
 'declared_tracks':[{k:a.get(k) for k in ['id','src','data-start','data-duration','data-volume']} for a in tracks],
 'narration':{'estimated_timing_error_seconds':lag,'whole_source_projection':whole,'active_windows':windows,'median_window_correlation':median_corr,'p10_window_correlation':p10_corr,'median_projected_voice_to_mixed_residual_db':median_ratio},
 'music':{'sfx_free_stereo_intervals':side_intervals,'median_side_rms_under_voice_dbfs':median_side,'median_original_music_side_correlation':median_music_identity,'fraction_windows_music_correlation_at_least_0point5':matching_music_fraction,'outro':{'start':outro_start,'end':outro_end,'rms_dbfs':db(rms(outro)),'side_rms_dbfs':db(rms(outro_side))},'authored_carve':carve,'carved_peaking_nodes':len(carved_peaks),'carved_gain_nodes':len(carved_gain),'changing_automation_lanes':changing_lanes},
 'final_mix':{'integrated_lufs':integrated,'true_peak_dbtp':true_peak,'loudness_range_lu':float(levels['input_lra'])},
 'threshold_reasoning':['A 25 ms lag limit is below one 30 fps picture frame and catches shifted narration.','Correlation >=0.90 globally/median with >=0.80 at the 10th percentile requires the same narrator waveform to dominate the mix while tolerating AAC and added music; median fitted voice/residual ratio >=8 dB requires at least 6.3 times the residual energy.','SFX-free stereo side energy above -60 dBFS and an outro above -50 dBFS reject a missing/muted stereo bed while allowing a quiet speech mix. Median side correlation with the original music >=0.70, with >=80% of windows >=0.50, requires actual music identity beyond merely nonzero stereo codec artifacts while allowing the canonical EQ to alter phase. These are presence/identity gates, not listening-quality scores.','The -20 to -13 LUFS range is this project’s broad social-delivery gate, not a claimed Instagram requirement. A <=-1 dBTP ceiling preserves encoding headroom.'],
 'checks':checks,'passed':all(checks.values()),
 'limits':['The mixed residual includes music, SFX, AAC error and projection error. It is not an independently reconstructed processed music stem.','Canonical carve metadata is checked for valid references and changing lanes; waveform evidence verifies source voice and music presence, not the exact offline effect implementation.','Stereo evidence under voice can include codec artifacts; attribution also uses direct correlation with the original music side channel, the mono narrator, exclusion of SFX windows and the independently non-silent music-only outro.','Single synthesis-call provenance comes from the generator/cue record. Waveform continuity alone does not establish a model invocation count.','This is not independent speech recognition, a transcription accuracy test, a subjective listening review or a score for naturalness/energy.']}
(evidence/'audio-match.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'checks':checks,'timing_error_seconds':lag,'voice_correlation':whole['correlation'],'median_voice_residual_db':median_ratio,'music_side_under_voice_dbfs':median_side,'music_identity_correlation':median_music_identity,'music_outro_dbfs':db(rms(outro)),'final_mix':report['final_mix']},indent=2))
raise SystemExit(0 if report['passed'] else 1)
