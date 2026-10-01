// Optional React wrapper. Uses the host project's React; do not install a second copy.
// Keep verifyPhrase, onGranted, and clips stable (module constants/useCallback/useMemo).
import {useEffect, useRef} from 'react';
import {mountPortraitGate} from '../src/portrait-gate.js';
import '../src/portrait-gate.css';
export function PortraitGate({portraitUrl, portraitIncludesFrame=false, clips, verifyPhrase, onGranted}) {
 const host=useRef(null);
 useEffect(()=>{
  const gate=mountPortraitGate(host.current,{portraitUrl,portraitIncludesFrame,clips,verifyPhrase,onGranted});
  return ()=>gate.destroy();
 },[portraitUrl,portraitIncludesFrame,clips,verifyPhrase,onGranted]);
 return <div ref={host}/>;
}
