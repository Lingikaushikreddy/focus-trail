#!/usr/bin/env python3
"""Independent frozen narration checks. No ASR or subjective listening claim."""
import hashlib,json,re,subprocess,wave
from pathlib import Path
project=Path(__file__).resolve().parents[1]
meta=json.loads((project/'narration-cues.json').read_text())
cues=meta['cues']; results=[]
for cue in cues:
    p=project/cue['path']
    with wave.open(str(p),'rb') as w:
        fmt=dict(channels=w.getnchannels(),sampleRate=w.getframerate(),sampleWidth=w.getsampwidth(),frames=w.getnframes(),compression=w.getcomptype())
    duration=fmt['frames']/fmt['sampleRate']
    cmd=['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-17:TP=-2:LRA=7:print_format=json,silencedetect=noise=-45dB:d=0.3','-f','null','-']
    proc=subprocess.run(cmd,capture_output=True,text=True,check=True)
    loudness=json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',proc.stderr)[-1])
    silence=[]
    for match in re.finditer(r'silence_end: ([0-9.]+) \| silence_duration: ([0-9.]+)',proc.stderr):
        end,length=map(float,match.groups());silence.append(dict(start=round(end-length,6),end=end,duration=length))
    internal=[x for x in silence if x['start']>.1 and x['end']<duration-.1]
    digest=hashlib.sha256(p.read_bytes()).hexdigest()
    checks={
        'sha256Matches':digest==cue['sha256'],
        'durationMatches':abs(duration-cue['duration'])<.0001,
        'fits20SecondEdit':cue['start']+duration<=19.8,
        'pcm16Mono48k':fmt['sampleRate']==48000 and fmt['channels']==1 and fmt['sampleWidth']==2 and fmt['compression']=='NONE',
        'truePeakAtOrBelowMinus1point9':float(loudness['input_tp'])<=-1.9,
        'singleContinuousCue':len(cues)==1 and cue['id']=='narration',
        'singleSynthesisResult':meta['synthesis']['calls']==1 and meta['synthesis']['resultChunks']==1,
        'nativeDurationPreserved':abs(duration-meta['synthesis']['nativeDuration'])<.0001,
        'allEstimatedWordEndingsInsideWav':max(w['end'] for w in cue['words'])<=duration,
        'noLongInternalSilentGaps':all(x['duration']<.65 for x in internal),
    }
    results.append(dict(id=cue['id'],duration=duration,sha256=digest,format=fmt,integratedLufs=float(loudness['input_i']),truePeakDbtp=float(loudness['input_tp']),silenceMeasurement=dict(thresholdDb=-45,minimumDuration=.3,internalSilences=internal,maximumAllowedInternalSeconds=.65,note='Natural model punctuation includes brief question/sentence pauses. Continuity also requires one synthesis result and exact native duration; silence is not removed to force a flat cadence.'),checks=checks))
report={'method':'Independent WAV headers, SHA-256, duration and FFmpeg loudness/silence measurements. Single-pass provenance comes from the generator. Spoken words use the synthesis text and native estimated token boundaries; no ASR or subjective listening claim.','cues':results,'passed':all(all(r['checks'].values()) for r in results)}
(project/'narration-verification.json').write_text(json.dumps(report,indent=2)+'\n')
(project/'evidence'/'narration-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
