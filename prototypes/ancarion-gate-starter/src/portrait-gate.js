/** Framework-independent UI only. Authorization belongs to the server. */
export function mountPortraitGate(host, options) {
  if (!host || typeof options?.verifyPhrase !== 'function') {
    throw new Error('A host element and verifyPhrase callback are required.');
  }
  const life = new AbortController();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false, state = 'locked', generation = 0, request = null;
  let mediaGeneration = 0, paused = reduced.matches, currentMedia = 'idle';
  let cooldownUntil = 0;
  const timers = new Map();
  const clips = options.clips || {};
  const element = document.createElement('section');
  element.className = 'apg';
  element.dataset.state = state;
  element.innerHTML = `
    <header class="apg-header"><span>THALMOR ARCHIVES</span><span>Restricted collection</span></header>
    <div class="apg-layout">
      <div class="apg-portrait-column">
        <div class="apg-stage">
          <div class="apg-reveal" aria-hidden="true"><span class="apg-kicker">The seal is lifted</span><h2>You are expected.</h2><p>The inner collection awaits.</p></div>
          <div class="apg-door">
            <div class="apg-media">
              <div class="apg-missing">Ancarion’s portrait<br><small>Choose the existing asset in the demo.</small></div>
              <img class="apg-poster" alt="Portrait of Ancarion, guardian of the restricted archives" hidden>
              <video class="apg-video" muted playsinline preload="none" aria-hidden="true" hidden></video>
              <div class="apg-canvas-texture" aria-hidden="true"></div>
            </div>
          </div>
        </div>
        <button class="apg-motion" type="button" hidden>Pause portrait</button>
      </div>
      <div class="apg-copy">
        <p class="apg-kicker">Ancarion · Keeper of the threshold</p>
        <h1>A word opens<br>what force cannot.</h1>
        <p class="apg-dialogue" aria-live="polite">“State the phrase entrusted to you.”</p>
        <form class="apg-form">
          <label>Passphrase<input name="phrase" type="password" autocomplete="off" required maxlength="256" spellcheck="false"></label>
          <button class="apg-submit" type="submit">Present your words →</button>
        </form>
        <p class="apg-status" role="status"></p>
        <button class="apg-skip" type="button" hidden>Skip opening animation</button>
      </div>
    </div>`;
  host.append(element);
  const q = s => element.querySelector(s);
  const input = q('input'), submit = q('.apg-submit'), form = q('form');
  const poster = q('.apg-poster'), video = q('video');
  const dialogue = q('.apg-dialogue'), status = q('.apg-status');
  const skip = q('.apg-skip'), motion = q('.apg-motion');
  const reveal = q('.apg-reveal');
  if (options.portraitIncludesFrame) element.classList.add('apg-baked-frame');
  if (options.portraitPosition) poster.style.objectPosition = options.portraitPosition;
  if (options.aspectRatio) q('.apg-stage').style.aspectRatio = options.aspectRatio;
  poster.addEventListener('load', () => { poster.hidden = false; q('.apg-missing').hidden = true; }, {signal: life.signal});
  poster.addEventListener('error', () => { poster.hidden = true; q('.apg-missing').hidden = false; status.textContent = 'Portrait unavailable. The gate still works.'; }, {signal: life.signal});
  if (options.portraitUrl) poster.src = options.portraitUrl;
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms);
    timers.set(id, true); return id;
  }
  function cancelTimers() { for (const id of timers.keys()) clearTimeout(id); timers.clear(); }
  function setState(next) {
    state = next; element.dataset.state = next;
    const busy = ['checking', 'accepted', 'opening', 'unlocked'].includes(next);
    submit.disabled = busy; input.disabled = busy;
    element.setAttribute('aria-busy', String(next === 'checking'));
  }
  function still() { ++mediaGeneration; video.pause(); video.hidden = true; }
  async function play(name) {
    currentMedia = name;
    const url = clips[name];
    if (paused || reduced.matches || !url) { still(); return; }
    const token = ++mediaGeneration;
    video.hidden = true; video.pause(); video.loop = name === 'idle';
    video.muted = true; video.src = url; video.load();
    try {
      await video.play();
      if (!destroyed && token === mediaGeneration) video.hidden = false;
    } catch { if (token === mediaGeneration) video.hidden = true; }
  }
  video.addEventListener('error', () => { video.hidden = true; }, {signal: life.signal});
  video.addEventListener('ended', () => {
    if (!['accepted','opening','unlocked'].includes(state)) void play('idle');
  }, {signal: life.signal});
  motion.hidden = !Object.values(clips).some(Boolean);
  function motionLabel() {
    motion.textContent = paused || reduced.matches ? 'Resume portrait' : 'Pause portrait';
    motion.setAttribute('aria-pressed', String(paused || reduced.matches));
    motion.disabled = reduced.matches;
  }
  motion.addEventListener('click', () => { paused = !paused; motionLabel(); if (paused) still(); else void play(currentMedia); }, {signal: life.signal});
  reduced.addEventListener('change', () => { motionLabel(); if (reduced.matches) still(); else if (!paused) void play(currentMedia); }, {signal: life.signal});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) still(); else if (state !== 'unlocked') void play(currentMedia);
  }, {signal: life.signal});
  function finish() {
    if (!['accepted', 'opening'].includes(state)) return;
    cancelTimers(); setState('unlocked'); still();
    form.hidden = true; skip.hidden = true;
    reveal.setAttribute('aria-hidden', 'false');
    status.textContent = 'Access granted.';
    // The application decides what to fetch/render/navigate to. No protected HTML is bundled here.
    try { options.onGranted?.(); } catch { status.textContent = 'Access granted, but the next view could not be opened.'; }
  }
  skip.addEventListener('click', finish, {signal: life.signal});
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (destroyed || ['checking','accepted','opening','unlocked'].includes(state)) return;
    if (Date.now() < cooldownUntil) {
      status.textContent = `Please wait ${Math.ceil((cooldownUntil-Date.now())/1000)} seconds before retrying.`;
      return;
    }
    if (!input.value.trim()) { status.textContent = 'Enter the passphrase.'; input.focus(); return; }
    const token = ++generation;
    request?.abort(); request = new AbortController();
    const activeRequest = request;
    setState('checking'); input.removeAttribute('aria-invalid');
    status.textContent = 'Checking authorization…';
    dialogue.textContent = '“One moment.”'; void play('listening');
    const phrase = input.value; input.value = '';
    const timeout = new Promise((_, reject) => later(() => {
      activeRequest.abort(); reject(new Error('Request timeout'));
    }, options.requestTimeoutMs ?? 12000));
    try {
      const result = await Promise.race([options.verifyPhrase(phrase, {signal: activeRequest.signal}), timeout]);
      if (destroyed || token !== generation) return;
      cancelTimers();
      if (result?.ok !== true) {
        setState('denied'); input.setAttribute('aria-invalid','true');
        const retry = Math.min(3600, Math.max(0, Number(result?.retryAfterSeconds) || 0));
        cooldownUntil = Date.now() + retry * 1000;
        dialogue.textContent = '“That is not the phrase I was given.”';
        status.textContent = retry ? `Please wait ${retry} seconds before retrying.` : 'Access refused. Try again.';
        void play('denied'); input.focus(); return;
      }
      setState('accepted'); status.textContent = 'Authorization recognized.';
      dialogue.textContent = '“You are expected. Enter.”';
      void play('accepted'); skip.hidden = false; skip.focus();
      if (reduced.matches) { finish(); return; }
      later(() => {
        setState('opening'); reveal.setAttribute('aria-hidden','false');
        later(finish, 1450);
      }, options.acceptedHoldMs ?? (clips.accepted ? 1600 : 450));
    } catch {
      if (destroyed || token !== generation) return;
      cancelTimers(); setState('error'); still();
      dialogue.textContent = '“The registry is unavailable. A moment of patience.”';
      status.textContent = 'Could not check access. Please retry.'; input.focus();
    }
  }, {signal: life.signal});
  input.addEventListener('focus', () => {
    if (state === 'locked') { dialogue.textContent = '“I am listening.”'; void play('listening'); }
  }, {signal: life.signal});
  motionLabel(); void play('idle');
  return {
    getState: () => state,
    destroy() {
      if (destroyed) return;
      destroyed = true; ++generation; request?.abort(); cancelTimers(); life.abort();
      still(); video.removeAttribute('src'); video.load(); element.remove();
    }
  };
}
