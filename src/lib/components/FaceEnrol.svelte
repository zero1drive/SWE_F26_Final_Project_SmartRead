<script lang="ts">
  // Enrol your face for face login: grab ~20 webcam frames, send them, wait for training.
  import { onDestroy, tick } from 'svelte';
  import { grabFrame, sleep, startCamera, stopCamera } from '$lib/camera';
  let { frames = 20 }: { frames?: number } = $props();

  let video: HTMLVideoElement | undefined = $state();
  let stream: MediaStream | null = null;
  let phase = $state<'idle' | 'camera' | 'capturing' | 'training' | 'done'>('idle');
  let taken = $state(0);
  let message = $state<{ text: string; bad?: boolean } | null>(null);

  onDestroy(() => stopCamera(stream));

  async function open() {
    message = null;
    phase = 'camera';
    await tick();
    try {
      stream = await startCamera(video!);
    } catch (e) {
      phase = 'idle';
      message = { text: (e as Error).message, bad: true };
    }
  }

  async function capture() {
    phase = 'capturing';
    const images: string[] = [];
    for (taken = 0; taken < frames; taken++) {
      images.push(grabFrame(video!));
      await sleep(150);
    }
    stopCamera(stream);
    phase = 'training';
    const res = await fetch('/face', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ images }) });
    const body = await res.json();
    if (!res.ok) {
      phase = 'idle';
      message = { text: body.error, bad: true };
      return;
    }
    // training runs in the Python service; check every 2 seconds
    for (;;) {
      await sleep(2000);
      const s = await (await fetch('/face')).json();
      if (!s.up) return ((phase = 'idle'), (message = { text: s.error, bad: true }));
      if (!s.training) {
        phase = s.error ? 'idle' : 'done';
        message = s.error ? { text: s.error, bad: true } : { text: 'Your face is enrolled. Next time, choose "Log in with my face".' };
        return;
      }
    }
  }
</script>

<div class="face">
  <h2>Face login</h2>
  <p class="small muted">
    We take {frames} pictures from your camera and train a small YOLO model to recognise you. The photos stay on this computer.
    Face the camera in good light.
  </p>
  {#if message}<p class="notice" class:bad={message.bad}>{message.text}</p>{/if}

  {#if phase === 'camera' || phase === 'capturing'}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} playsinline muted></video>
    {#if phase === 'camera'}
      <button class="primary" onclick={capture}>Take {frames} pictures</button>
    {:else}
      <p class="hand progress">hold still… {taken}/{frames}</p>
    {/if}
  {:else if phase === 'training'}
    <p class="hand progress">training… this takes a minute or two on a laptop</p>
  {:else}
    <button onclick={open}>{phase === 'done' ? 'Enrol again' : 'Enrol my face'}</button>
  {/if}
</div>

<style>
  video { width: 240px; aspect-ratio: 4/3; background: var(--ink); display: block; margin-bottom: 0.6rem; transform: scaleX(-1); }
  .progress { font-size: 1.4rem; color: var(--accent); }
</style>
