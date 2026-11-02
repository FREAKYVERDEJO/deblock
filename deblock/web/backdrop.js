// An original, procedural analog field. No images, tracking, or external assets.
(() => {
  const canvas = document.getElementById('field');
  const context = canvas.getContext('2d');
  const button = document.getElementById('effects');
  const label = document.getElementById('effects-label');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reducedMotion.matches;
  let frame = null;
  let lastTime = 0;
  let phase = 0;
  let width = 0;
  let height = 0;

  function draw() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const centerX = width * .78;
    const centerY = height * .29;
    const scale = Math.max(width * .42, 400);
    context.globalCompositeOperation = 'screen';
    // Uneven contours form a luminous folded ribbon, with RGB displacement.
    for (let ring = 0; ring < 90; ring++) {
      const radius = scale * (.24 + ring * .008);
      const depth = ring / 90;
      for (let channel = 0; channel < 2; channel++) {
        context.beginPath();
        context.strokeStyle = channel === 0
          ? `rgba(${145 + ring}, 25, 255, ${.12 + .24 * Math.sin(depth * Math.PI)})`
          : `rgba(35, ${100 + ring}, 255, .15)`;
        context.lineWidth = ring % 9 === 0 ? 1.7 : .7;
        for (let step = 0; step <= 180; step++) {
          const angle = step / 180 * Math.PI * 2;
          const ripple = Math.sin(angle * 5 + depth * 8 + phase * .5) * .13
            + Math.cos(angle * 3 - phase * .38) * .16;
          const bend = Math.sin(angle * 2 + depth * 4 + phase * .6);
          let x = centerX + Math.cos(angle) * radius * (1 + ripple);
          let y = centerY + Math.sin(angle) * radius * (.65 + ripple) + bend * 45;
          // Horizontal tape-like shear, oscillating smoothly instead of flashing.
          x += Math.sin(y * .036 + phase) * 15 * Math.sin(depth * 5 + phase * .4);
          x += channel * 5 + Math.sin(phase * .4) * 75;
          y += Math.cos(phase * .3) * 20;
          if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath();
        context.stroke();
      }
    }
    // Thin signal fragments add a softly broken, analog texture.
    for (let i = 0; i < 48; i++) {
      const y = (i * 73.9) % height;
      const x = width * .45 + Math.sin(i * 8.1 + phase * .2) * width * .4;
      context.fillStyle = i % 3 ? '#c739ff15' : '#58dcff20';
      context.fillRect(x, y, 12 + (i * 13) % 100, 1);
    }
    context.globalCompositeOperation = 'source-over';
  }

  function tick(now) {
    frame = null;
    if (!motion || document.hidden) return;
    // Cap drawing at 24 fps; elapsed time is bounded after a suspended frame.
    if (now - lastTime >= 1000 / 24) {
      phase += Math.min(now - lastTime, 80) / 1000;
      lastTime = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    document.body.classList.toggle('motion-on', motion);
    document.body.classList.toggle('page-hidden', document.hidden);
    button.setAttribute('aria-pressed', String(motion));
    label.textContent = motion ? 'Motion on' : 'Motion off';
    if (motion && !document.hidden && context) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    } else draw();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  }

  button.addEventListener('click', () => { motion = !motion; sync(); });
  reducedMotion.addEventListener('change', () => { motion = !reducedMotion.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', resize);
  resize();
  sync();
})();
