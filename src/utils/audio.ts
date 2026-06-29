/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class DiceAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn('AudioContext not supported by browser:', e);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.isMuted && this.ctx.state === 'running') {
      this.ctx.suspend();
    } else if (this.ctx && !this.isMuted && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.isMuted;
  }

  getMuteState(): boolean {
    return this.isMuted;
  }

  // Synthesize a high-pitched click/clack sound for dice colliding with each other
  playDiceCollision(velocity: number) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    // Resume context if suspended (browser security autoplay policies)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity, 0.05), 1.0) * 0.4; // Cap volume

    // Node 1: Short sine wave frequency sweep (recreates the click)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep from ~1800Hz down to ~1000Hz for a sharp clack
    const baseFreq = 1600 + Math.random() * 400;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.03);

    // Exponential volume decay
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);

    // Node 2: High pass filtered noise for the textured rattle/friction
    try {
      const bufferSize = this.ctx.sampleRate * 0.02; // Very short 20ms burst
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(3000, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.6, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.03);
    } catch (e) {
      // Fallback if buffer creation fails
    }
  }

  // Synthesize a lower, damped thud sound for dice hitting the wooden wall
  playWallCollision(velocity: number) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity, 0.05), 1.0) * 0.5;

    // Node 1: Bass Thud (low triangle wave)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 110 + Math.random() * 30; // ~120Hz
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.11);

    // Node 2: Low-pass filtered noise to simulate wooden contact rattle
    try {
      const bufferSize = this.ctx.sampleRate * 0.04; // 40ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(250, t);
      noiseFilter.Q.setValueAtTime(2.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.05);
    } catch (e) {
      // Fallback
    }
  }
}

export const diceAudio = new DiceAudioEngine();
