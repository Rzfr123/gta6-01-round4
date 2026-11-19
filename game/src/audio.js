// Sound: everything is synthesized with WebAudio — no audio files, no
// network. Engine hum, gunshots, pickups, and three radio stations
// (Vice Coast FM, Gator FM, Solmar Talk) each with its own little sequenced
// synth loop.

export function initAudio(G) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  G.audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    station: 0,
    radioOn: true,
    radioTimer: null,
    stations: [
      { name: 'Vice Coast FM', tempo: 116, scale: [0, 3, 5, 7, 10], wave: 'sawtooth', base: 220 },
      { name: 'Gator FM', tempo: 92, scale: [0, 2, 5, 7, 9], wave: 'square', base: 165 },
      { name: 'Solmar Talk', tempo: 0, scale: [], wave: 'sine', base: 0 },
    ],
    ensure() {
      if (this.ctx) return;
      try {
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 50;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
      } catch (e) {
        this.ctx = null;
      }
    },
    setEngine(amount) {
      if (!this.ctx || !this.engineOsc) return;
      const t = this.ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(45 + amount * 160, t, 0.08);
      this.engineGain.gain.setTargetAtTime(amount * 0.06, t, 0.1);
    },
    blip(freq, dur, type = 'square', vol = 0.2) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur);
    },
    playShot() { this.blip(180, 0.12, 'square', 0.25); this.blip(60, 0.18, 'sawtooth', 0.2); },
    playHit() { this.blip(880, 0.08, 'sine', 0.2); },
    playPickup() { this.blip(660, 0.1, 'sine', 0.2); setTimeout(() => this.blip(990, 0.14, 'sine', 0.2), 90); },
    playSirenBlip() { this.blip(700, 0.15, 'square', 0.15); setTimeout(() => this.blip(950, 0.15, 'square', 0.15), 160); },
    nextStation() {
      this.station = (this.station + 1) % this.stations.length;
      this.startRadio();
      return this.stations[this.station].name;
    },
    startRadio() {
      if (this.radioTimer) { clearInterval(this.radioTimer); this.radioTimer = null; }
      if (!this.ctx || !this.radioOn) return;
      const st = this.stations[this.station];
      if (st.tempo === 0) {
        // Solmar Talk: a low chatty murmur — two detuned sines, no melody.
        return;
      }
      let step = 0;
      const beat = 60000 / st.tempo / 2;
      this.radioTimer = setInterval(() => {
        if (!this.ctx || G.state !== 'play') return;
        const scale = st.scale;
        const note = scale[step % scale.length] + 12 * Math.floor(step / scale.length) % 24;
        const freq = st.base * Math.pow(2, note / 12);
        this.blip(freq, 0.22, st.wave, 0.05);
        if (step % 4 === 0) this.blip(st.base / 2, 0.3, 'sine', 0.09);
        step += 1;
      }, beat);
    },
  };
}
