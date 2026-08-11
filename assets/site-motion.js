(() => {
  const root = document.documentElement;
  const field = document.querySelector('.stardust-field');
  const halo = document.querySelector('.pointer-halo');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Always generate the same gentle star field so the composition does not jump.
  let seed = 1208;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  if (field) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 28; i += 1) {
      const star = document.createElement('i');
      star.className = i % 7 === 0 ? 'stardust is-large' : 'stardust';
      star.style.setProperty('--left', `${4 + random() * 92}%`);
      star.style.setProperty('--top', `${2 + random() * 96}%`);
      star.style.setProperty('--delay', `${-random() * 12}s`);
      star.style.setProperty('--duration', `${8 + random() * 9}s`);
      star.style.setProperty('--drift', `${-18 + random() * 36}px`);
      fragment.appendChild(star);
    }
    field.appendChild(fragment);
  }

  let frame = 0;
  const moveAtmosphere = (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      root.style.setProperty('--shift-x', `${nx * 14}px`);
      root.style.setProperty('--shift-y', `${ny * 14}px`);
      root.style.setProperty('--shift-x-reverse', `${nx * -9}px`);
      root.style.setProperty('--shift-y-reverse', `${ny * -9}px`);
      if (halo) {
        halo.style.setProperty('--halo-x', `${event.clientX}px`);
        halo.style.setProperty('--halo-y', `${event.clientY}px`);
        halo.classList.add('is-visible');
      }
    });
  };

  window.addEventListener('pointermove', moveAtmosphere, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => halo?.classList.remove('is-visible'));

  const burst = (x, y) => {
    if (reducedMotion.matches) return;
    const colors = ['#e5b86f', '#9fcbb8', '#d6a8bb', '#ffffff'];
    for (let i = 0; i < 7; i += 1) {
      const spark = document.createElement('i');
      const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.35;
      const distance = 18 + Math.random() * 34;
      spark.className = 'tap-spark';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--spark-color', colors[i % colors.length]);
      document.body.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  };

  document.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('a, button, input, select, textarea')) return;
    burst(event.clientX, event.clientY);
  });

  if (finePointer.matches && !reducedMotion.matches) {
    document.querySelectorAll('.card, .minor a').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tilt-x', `${py * -2.2}deg`);
        card.style.setProperty('--tilt-y', `${px * 2.8}deg`);
        card.style.setProperty('--shine-x', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--shine-y', `${(py + 0.5) * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });
    });
  }

  // The hero is a tiny playable pixel-art garden: one Mochisura roams,
  // while the potted Mochisura quietly grows through its early stages.
  const world = document.querySelector('#pixelWorld');
  const petActor = document.querySelector('#petActor');
  const petSprite = document.querySelector('#petSprite');
  const potActor = document.querySelector('#potActor');
  const potSlime = document.querySelector('#potSlime');
  const heroMessage = document.querySelector('#heroMessage');
  const timeToggle = document.querySelector('#timeToggle');
  const nightStars = document.querySelector('#nightStars');

  if (world && petActor && petSprite && potActor && potSlime && heroMessage && timeToggle && nightStars) {
    const cell = 192;
    const stages = [
      ['me.png', '芽'],
      ['futaba.png', '双葉'],
      ['wakagi.png', '若木'],
      ['tsubomi.png', '蕾'],
      ['mankai.png', '満開'],
      ['minori.png', '実り'],
      ['irozuki.png', '色づき'],
      ['ochiba.png', '落ち葉'],
      ['tsuchi.png', '土'],
      ['kaze.png', '風'],
      ['tane.png', '種'],
      ['ne.png', '根']
    ];
    const growthKey = 'mochisura-growth-v1';
    let growthState = { unlocked: 1, selected: 0, care: 0, affection: 0 };
    try {
      growthState = { ...growthState, ...JSON.parse(localStorage.getItem(growthKey)) };
    } catch (_) {}
    growthState.unlocked = Math.max(1, Math.min(stages.length, Number(growthState.unlocked) || 1));
    let stageIndex = Math.max(0, Math.min(growthState.unlocked - 1, Number(growthState.selected) || 0));
    let petX = 18;
    let petDirection = 1;
    let petTarget = null;
    let previousTime = performance.now();
    let happyUntil = 0;
    let messageTimer = 0;

    stages.forEach(([file]) => {
      const image = new Image();
      image.src = `slime/images_pixel/${file}`;
    });

    const starFragment = document.createDocumentFragment();
    for (let i = 0; i < 24; i += 1) {
      const star = document.createElement('i');
      star.style.setProperty('--star-x', `${6 + ((i * 37) % 88)}%`);
      star.style.setProperty('--star-y', `${8 + ((i * 53) % 56)}%`);
      star.style.setProperty('--star-size', `${2 + (i % 3) * 2}px`);
      star.style.setProperty('--star-delay', `${-(i % 7) * .31}s`);
      star.style.setProperty('--star-speed', `${1.3 + (i % 5) * .38}s`);
      starFragment.appendChild(star);
    }
    nightStars.appendChild(starFragment);

    const say = (message, duration = 2600) => {
      heroMessage.textContent = message;
      clearTimeout(messageTimer);
      messageTimer = window.setTimeout(() => {
        heroMessage.textContent = '庭をタップすると、もちスラが来るよ';
      }, duration);
    };

    const setNight = (night, announce = false) => {
      world.classList.toggle('is-night', night);
      timeToggle.setAttribute('aria-pressed', String(night));
      timeToggle.setAttribute('aria-label', night ? '昼の庭に戻す' : '夜の庭に切り替える');
      try { localStorage.setItem('mochisura-garden-night', night ? '1' : '0'); } catch (_) {}
      document.dispatchEvent(new CustomEvent('mochisura:sky-mode', { detail: { night } }));
      if (announce) say(night ? '月がのぼって、星空になった！' : '太陽がのぼって、朝になった！');
    };

    let savedNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
    try {
      const storedNight = localStorage.getItem('mochisura-garden-night');
      if (storedNight !== null) savedNight = storedNight === '1';
    } catch (_) {}
    setNight(savedNight, false);

    const setPetFrame = (row, column) => {
      petSprite.style.backgroundPosition = `${column * -cell}px ${row * -cell}px`;
    };

    const maximumPetX = () => Math.max(18, world.clientWidth - potActor.offsetWidth - petActor.offsetWidth - 64);

    const makeHeroBurst = (x, y, colors = ['#f6d878', '#ef9cb3', '#ffffff', '#7caf70']) => {
      if (reducedMotion.matches) return;
      for (let i = 0; i < 8; i += 1) {
        const particle = document.createElement('i');
        const angle = (Math.PI * 2 * i) / 8;
        const distance = 25 + Math.random() * 28;
        particle.className = 'hero-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance - 15}px`);
        particle.style.setProperty('--particle-color', colors[i % colors.length]);
        world.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove(), { once: true });
      }
    };

    const growPot = (announce = true) => {
      growthState.care = Math.max(0, Number(growthState.care) || 0) + 1;
      let discovered = false;
      if (growthState.care >= 3 && growthState.unlocked < stages.length) {
        growthState.care = 0;
        growthState.unlocked += 1;
        growthState.selected = growthState.unlocked - 1;
        stageIndex = growthState.selected;
        discovered = true;
      }
      try { localStorage.setItem(growthKey, JSON.stringify({ ...growthState, updatedAt: Date.now() })); } catch (_) {}
      const [file, label] = stages[stageIndex];
      potSlime.src = `slime/images_pixel/${file}`;
      potSlime.alt = `${label}の鉢植えもちスラ`;
      potActor.classList.remove('is-growing');
      void potActor.offsetWidth;
      potActor.classList.add('is-growing');
      window.setTimeout(() => potActor.classList.remove('is-growing'), 760);
      makeHeroBurst(
        potActor.offsetLeft + potActor.offsetWidth * .52,
        potActor.offsetTop + potActor.offsetHeight * .3,
        ['#87bf68', '#b9e779', '#f6d878', '#ffffff']
      );
      if (announce) {
        if (discovered) say(`新しい景色「${label}」に出会った！`);
        else if (growthState.unlocked === stages.length) say('十二の景色をめぐったもちスラです');
        else say(`お世話したよ。次の景色まであと${3 - growthState.care}回`);
      }
    };

    const animatePet = (time) => {
      const elapsed = Math.min(40, time - previousTime);
      previousTime = time;
      const maxX = maximumPetX();

      if (petTarget !== null) {
        const delta = petTarget - petX;
        petDirection = delta >= 0 ? 1 : -1;
        petX += petDirection * Math.min(Math.abs(delta), elapsed * .095);
        if (Math.abs(delta) < 2) {
          petX = petTarget;
          petTarget = null;
          happyUntil = time + 720;
          makeHeroBurst(petX + petActor.offsetWidth * .55, petActor.offsetTop + 28);
          say('もちスラが遊びにきた！');
        }
      } else if (time >= happyUntil) {
        petX += petDirection * elapsed * .018;
        if (petX >= maxX) { petX = maxX; petDirection = -1; }
        if (petX <= 18) { petX = 18; petDirection = 1; }
      }

      petActor.style.left = `${petX}px`;

      if (time < happyUntil) {
        setPetFrame(3, Math.floor(time / 170) % 4);
      } else {
        setPetFrame(petDirection > 0 ? 1 : 2, Math.floor(time / 115) % 8);
      }
      requestAnimationFrame(animatePet);
    };

    world.addEventListener('pointerdown', (event) => {
      if (event.target.closest('a, button')) return;
      event.stopPropagation();
      const rect = world.getBoundingClientRect();
      petTarget = Math.max(18, Math.min(maximumPetX(), event.clientX - rect.left - petActor.offsetWidth / 2));
      petDirection = petTarget >= petX ? 1 : -1;
      say('そこへ向かうよ…');
    });

    petActor.addEventListener('click', (event) => {
      event.stopPropagation();
      happyUntil = performance.now() + 1150;
      petActor.classList.remove('is-happy');
      void petActor.offsetWidth;
      petActor.classList.add('is-happy');
      window.setTimeout(() => petActor.classList.remove('is-happy'), 760);
      makeHeroBurst(petX + petActor.offsetWidth * .55, petActor.offsetTop + 30);
      say('もちスラは、なでられてうれしそう');
    });

    potActor.addEventListener('click', (event) => {
      event.stopPropagation();
      growPot(true);
    });

    timeToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const night = !world.classList.contains('is-night');
      setNight(night, true);
      makeHeroBurst(
        timeToggle.offsetLeft + timeToggle.offsetWidth / 2,
        timeToggle.offsetTop + timeToggle.offsetHeight / 2,
        night ? ['#fff4c4', '#b9e3f9', '#d8cbff', '#ffffff'] : ['#f6d878', '#ffe9a3', '#ffffff', '#efb56f']
      );
    });

    window.addEventListener('resize', () => {
      petX = Math.min(petX, maximumPetX());
      petActor.style.left = `${petX}px`;
    });

    if (reducedMotion.matches) {
      setPetFrame(0, 0);
    } else {
      requestAnimationFrame(animatePet);
    }

    const [currentFile, currentLabel] = stages[stageIndex];
    potSlime.src = `slime/images_pixel/${currentFile}`;
    potSlime.alt = `${currentLabel}の鉢植えもちスラ`;
  }
})();
