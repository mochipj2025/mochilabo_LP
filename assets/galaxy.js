(() => {
  if (document.querySelector('.galaxy-fx')) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const fx = document.createElement('div');
  fx.className = 'galaxy-fx';
  fx.setAttribute('aria-hidden', 'true');

  const constellationCanvas = document.createElement('canvas');
  constellationCanvas.className = 'galaxy-constellation-sky';
  fx.appendChild(constellationCanvas);

  const skyBadge = document.createElement('div');
  skyBadge.className = 'galaxy-sky-badge';
  skyBadge.innerHTML = '<span class="galaxy-sky-season"></span><small class="galaxy-sky-names"></small>';
  fx.appendChild(skyBadge);

  const stars = [
    ['12%', '76%', '9s', '-3s'],
    ['27%', '18%', '13s', '-8s'],
    ['6%', '43%', '16s', '-12s']
  ];
  stars.forEach(([top, left, speed, delay]) => {
    const star = document.createElement('i');
    star.className = 'galaxy-shooting-star';
    star.style.setProperty('--shoot-top', top);
    star.style.setProperty('--shoot-left', left);
    star.style.setProperty('--shoot-speed', speed);
    star.style.setProperty('--shoot-delay', delay);
    fx.appendChild(star);
  });
  document.body.appendChild(fx);

  // Normalized constellation drawings. These are deliberately simplified so
  // they read as a quiet part of the atmosphere rather than a star chart.
  const figures = {
    orion: {
      name: 'オリオン座',
      points: [[.18,.08],[.78,.12],[.36,.4],[.5,.42],[.64,.4],[.12,.88],[.82,.9]],
      lines: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]]
    },
    taurus: {
      name: 'おうし座',
      points: [[.12,.2],[.39,.43],[.53,.56],[.68,.4],[.9,.18],[.47,.61],[.3,.84]],
      lines: [[0,2],[1,2],[2,3],[3,4],[2,5],[5,6]]
    },
    gemini: {
      name: 'ふたご座',
      points: [[.28,.08],[.7,.12],[.2,.35],[.62,.39],[.36,.59],[.76,.61],[.23,.91],[.7,.92]],
      lines: [[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[2,3],[4,5]]
    },
    leo: {
      name: 'しし座',
      points: [[.17,.34],[.27,.12],[.45,.18],[.5,.38],[.38,.55],[.62,.6],[.9,.48],[.78,.82]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[4,5],[5,6],[6,7]]
    },
    virgo: {
      name: 'おとめ座',
      points: [[.12,.24],[.35,.43],[.56,.36],[.75,.12],[.62,.62],[.88,.78],[.36,.86]],
      lines: [[0,1],[1,2],[2,3],[2,4],[4,5],[4,6]]
    },
    bootes: {
      name: 'うしかい座',
      points: [[.5,.05],[.24,.33],[.4,.55],[.53,.92],[.68,.55],[.83,.31]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[2,4]]
    },
    scorpius: {
      name: 'さそり座',
      points: [[.13,.08],[.3,.24],[.45,.35],[.55,.51],[.58,.68],[.7,.84],[.86,.75],[.92,.57]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
    },
    cygnus: {
      name: 'はくちょう座',
      points: [[.5,.03],[.48,.29],[.12,.5],[.49,.51],[.87,.47],[.51,.92]],
      lines: [[0,1],[1,3],[3,5],[2,3],[3,4]]
    },
    lyra: {
      name: 'こと座',
      points: [[.18,.09],[.43,.35],[.77,.34],[.83,.78],[.38,.83]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,1]]
    },
    pegasus: {
      name: 'ペガスス座',
      points: [[.13,.19],[.78,.13],[.85,.77],[.22,.83],[.04,.46],[.96,.42]],
      lines: [[0,1],[1,2],[2,3],[3,0],[0,4],[1,5]]
    },
    andromeda: {
      name: 'アンドロメダ座',
      points: [[.05,.65],[.31,.48],[.56,.29],[.85,.12],[.53,.6],[.79,.83]],
      lines: [[0,1],[1,2],[2,3],[1,4],[4,5]]
    },
    aquarius: {
      name: 'みずがめ座',
      points: [[.13,.25],[.31,.12],[.46,.29],[.62,.11],[.79,.31],[.64,.55],[.82,.82],[.41,.87]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[5,7]]
    }
  };

  const seasons = [
    { key: 'winter', label: '冬の星空', months: [11, 0, 1], figures: ['orion', 'taurus', 'gemini'] },
    { key: 'spring', label: '春の星空', months: [2, 3, 4], figures: ['leo', 'virgo', 'bootes'] },
    { key: 'summer', label: '夏の星空', months: [5, 6, 7], figures: ['scorpius', 'cygnus', 'lyra'] },
    { key: 'autumn', label: '秋の星空', months: [8, 9, 10], figures: ['pegasus', 'andromeda', 'aquarius'] }
  ];

  const context = constellationCanvas.getContext('2d');
  const seasonText = skyBadge.querySelector('.galaxy-sky-season');
  const namesText = skyBadge.querySelector('.galaxy-sky-names');
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let currentSeason = seasons[0];
  let currentTime = new Date();
  let forcedNight = null;
  try {
    const storedNight = localStorage.getItem('mochisura-garden-night');
    if (storedNight !== null) forcedNight = storedNight === '1';
  } catch (_) {}

  const getSeason = (month) => seasons.find((season) => season.months.includes(month)) || seasons[0];
  const getSkyOpacity = (hour) => {
    if (forcedNight === true) return .9;
    if (forcedNight === false) return .25;
    if (hour >= 20 || hour < 4.5) return .82;
    if (hour >= 18) return .34 + (hour - 18) * .24;
    if (hour >= 4.5 && hour < 7) return .82 - (hour - 4.5) * .29;
    return .25;
  };

  const updateClock = () => {
    currentTime = new Date();
    currentSeason = getSeason(currentTime.getMonth());
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    const phase = forcedNight === true ? 'night' : forcedNight === false ? 'day' : hour >= 19 || hour < 5 ? 'night' : hour >= 17 || hour < 7 ? 'twilight' : 'day';
    document.documentElement.dataset.skyPhase = phase;
    document.documentElement.dataset.skySeason = currentSeason.key;
    seasonText.textContent = `${currentSeason.label} · ${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    namesText.textContent = currentSeason.figures.map((key) => figures[key].name).join('  /  ');
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    constellationCanvas.width = Math.round(width * pixelRatio);
    constellationCanvas.height = Math.round(height * pixelRatio);
    constellationCanvas.style.width = `${width}px`;
    constellationCanvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const drawConstellation = (figure, centerX, centerY, scale, opacity, time, index) => {
    const rotation = Math.sin((currentTime.getHours() + index * 2.4) * .23) * .055;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const project = ([px, py]) => {
      const localX = (px - .5) * scale;
      const localY = (py - .5) * scale;
      return [centerX + localX * cos - localY * sin, centerY + localX * sin + localY * cos];
    };

    context.save();
    context.lineWidth = 1;
    context.strokeStyle = `rgba(178, 207, 255, ${opacity * .45})`;
    context.shadowColor = `rgba(128, 178, 255, ${opacity * .4})`;
    context.shadowBlur = 7;
    context.beginPath();
    figure.lines.forEach(([start, end]) => {
      const [sx, sy] = project(figure.points[start]);
      const [ex, ey] = project(figure.points[end]);
      context.moveTo(sx, sy);
      context.lineTo(ex, ey);
    });
    context.stroke();

    figure.points.forEach((point, pointIndex) => {
      const [x, y] = project(point);
      const twinkle = reducedMotion.matches ? .75 : .55 + Math.sin(time * .0016 + pointIndex * 1.9 + index) * .24;
      const radius = pointIndex === 0 ? 2.7 : 1.5 + (pointIndex % 3) * .35;
      context.beginPath();
      context.fillStyle = `rgba(236, 245, 255, ${opacity * twinkle})`;
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });

    const labelPosition = project([.5, 1.09]);
    context.shadowBlur = 0;
    context.fillStyle = `rgba(205, 218, 255, ${opacity * .58})`;
    context.font = '500 11px "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif';
    context.textAlign = 'center';
    context.letterSpacing = '0.12em';
    context.fillText(figure.name, labelPosition[0], labelPosition[1]);
    context.restore();
  };

  const render = (time = 0) => {
    context.clearRect(0, 0, width, height);
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    const opacity = getSkyOpacity(hour);
    const hourDrift = ((hour - 21) / 24) * .34;
    const slots = [
      { x: .16, y: .28, scale: .22 },
      { x: .53, y: .18, scale: .27 },
      { x: .84, y: .37, scale: .2 }
    ];

    currentSeason.figures.forEach((key, index) => {
      const slot = slots[index];
      let normalizedX = slot.x - hourDrift;
      if (normalizedX < -.12) normalizedX += 1.24;
      if (normalizedX > 1.12) normalizedX -= 1.24;
      const scale = Math.max(104, Math.min(220, Math.min(width, height) * slot.scale));
      const y = height * slot.y + Math.sin((hour + index * 4) * .18) * height * .035;
      drawConstellation(figures[key], normalizedX * width, y, scale, opacity, time, index);
    });

    if (!reducedMotion.matches) requestAnimationFrame(render);
  };

  updateClock();
  resize();
  render();
  document.addEventListener('mochisura:sky-mode', (event) => {
    forcedNight = Boolean(event.detail?.night);
    updateClock();
  });
  window.setInterval(updateClock, 60000);
  window.addEventListener('resize', resize, { passive: true });

  if (finePointer.matches && !reducedMotion.matches) {
    let frame = 0;
    window.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - .5) * 18;
        const y = (event.clientY / window.innerHeight - .5) * 18;
        document.documentElement.style.setProperty('--galaxy-x', `${x}px`);
        document.documentElement.style.setProperty('--galaxy-y', `${y}px`);
      });
    }, { passive: true });
  }
})();
