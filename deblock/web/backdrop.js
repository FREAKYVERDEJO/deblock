// Playback of abstract pixel fields baked by scripts/generate_glitch.py.
// Texture positions stay fixed; only sparse pixels gently change brightness.
(() => {
  const canvas = document.getElementById('field');
  const context = canvas.getContext('2d');
  const slider = document.getElementById('distortion');
  const motionButton = document.getElementById('motion');
  const imageButton = document.getElementById('image-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  const names = ['signal-11', 'signal-29', 'signal-47', 'signal-83'];
  const frameWidth = 320, frameHeight = 224, frames = 32, columns = 8;
  let selected = Math.floor(Math.random() * names.length), source = null, sheet = null, width = 0, height = 0;
  let motion = !reduced.matches, paused = false, request = null, time = 0, last = 0;
  let lastFrame = -1, loadVersion = 0;

  function loadImage(url) {
    if (!cache.has(url)) {
      const image = new Image();
      image.src = url;
      cache.set(url, image.decode().then(() => image).catch((error) => {
        cache.delete(url);
        throw error;
      }));
    }
    return cache.get(url);
  }

  function draw() {
    if (!context || !source) return;
    const scale = Math.max(width / frameWidth, height / frameHeight);
    const w = frameWidth * scale, h = frameHeight * scale;
    const x = (width - w) / 2, y = (height - h) / 2;
    context.globalAlpha = 1;
    context.fillStyle = '#030308';
    context.fillRect(0, 0, width, height);
    context.globalAlpha = Number(slider.value) / 100;
    context.imageSmoothingEnabled = false;
    if (sheet) {
      const frame = Math.floor(time / (1000 / 4)) % frames;
      context.drawImage(sheet, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight,
        frameWidth, frameHeight, x, y, w, h);
      context.globalAlpha = 1;
      lastFrame = frame;
    } else {
      context.drawImage(source, x, y, w, h);
    }
    context.globalAlpha = 1;
  }

  function tick(now) {
    request = null;
    if (!motion || paused || document.hidden) return;
    time += Math.min(now - last, 100);
    last = now;
    if (Math.floor(time / (1000 / 4)) % frames !== lastFrame) draw();
    request = requestAnimationFrame(tick);
  }

  function sync() {
    if (request !== null) cancelAnimationFrame(request);
    request = null;
    motionButton.textContent = motion ? 'motion on' : 'motion off';
    motionButton.setAttribute('aria-pressed', String(motion));
    canvas.dataset.playing = String(motion && !paused && !document.hidden);
    if (motion && !paused && !document.hidden && sheet && context) {
      last = performance.now();
      request = requestAnimationFrame(tick);
    }
    draw();
  }

  async function selectImage() {
    const version = ++loadVersion;
    const name = names[selected];
    imageButton.textContent = 'colours';
    try {
      const still = await loadImage(`/assets/${name}-still.webp`);
      if (version !== loadVersion) return;
      source = still;
      sheet = null;
      draw();
      const atlas = await loadImage(`/assets/${name}-frames.webp`);
      if (version !== loadVersion) return;
      sheet = atlas;
      canvas.dataset.source = name;
      sync();
    } catch {
      document.getElementById('announcement').textContent = 'The texture could not load. You can still write.';
    }
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  slider.addEventListener('input', draw);
  motionButton.addEventListener('click', () => { motion = !motion; sync(); });
  imageButton.addEventListener('click', () => { selected = (selected + 1 + Math.floor(Math.random() * (names.length - 1))) % names.length; selectImage(); });
  reduced.addEventListener('change', () => { motion = !reduced.matches; sync(); });
  window.addEventListener('writingpause', (event) => { paused = event.detail; sync(); });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', resize);
  resize();
  sync();
  selectImage();
})();
