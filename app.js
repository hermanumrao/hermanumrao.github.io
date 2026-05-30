(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LATEST_COUNT = 9;
  const LATEST_COUNT_MOBILE = 6;
  const REPO_COUNT = 10;
  const REPO_COUNT_MOBILE = 6;
  const MOBILE_MQ = matchMedia('(max-width: 768px)');
  const isMobile = () => MOBILE_MQ.matches;
  const latestLimit = () => isMobile() ? LATEST_COUNT_MOBILE : LATEST_COUNT;
  const repoLimit = () => isMobile() ? REPO_COUNT_MOBILE : REPO_COUNT;
  const FORMSPREE = 'https://formspree.io/f/mpqneqpd';

  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n[k] = v;
      else n.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null) return;
      n.append(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  };

  const NAV = [
    { label: 'Home', route: 'home', section: 'intro' },
    { label: 'About', route: 'home', section: 'about' },
    { label: 'Resume', route: 'resume' },
    { label: 'Gallery', route: 'gallery' },
    { label: 'Projects', route: 'home', section: 'projects' },
    { label: 'Contact', route: 'home', section: 'contact' }
  ];

  let resume, gallery, repos = [];
  let galleryGrid = null;
  let galleryFilter = 'all';
  let lightbox = null;
  const state = { page: 'home', section: 'intro' };

  /* ── Router ── */
  const parseHash = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    if (raw === 'resume') return { page: 'resume', section: null };
    if (raw === 'gallery') return { page: 'gallery', section: null };
    if (!raw || raw === 'intro') return { page: 'home', section: 'intro' };
    return { page: 'home', section: raw };
  };

  const setHash = (page, section) => {
    if (page === 'resume') location.hash = '#/resume';
    else if (page === 'gallery') location.hash = '#/gallery';
    else if (section && section !== 'intro') location.hash = `#/${section}`;
    else location.hash = '#/';
  };

  const navigate = (page, section = null) => {
    setHash(page, section);
    applyRoute(false);
  };

  const applyRoute = (isPop = false) => {
    const route = parseHash();
    state.page = route.page;
    state.section = route.section;
    renderApp();
    requestAnimationFrame(() => {
      if (state.page === 'home' && state.section && state.section !== 'intro') {
        $(`#${state.section}`)?.scrollIntoView({ behavior: isPop ? 'auto' : 'smooth' });
      } else {
        window.scrollTo(0, 0);
      }
    });
  };

  /* ── SLAM canvas ── */
  const initCanvas = () => {
    const c = $('#slam-canvas'), ctx = c.getContext('2d');
    let W, H, mx = -999, my = -999, angle = 0;
    const FOCAL = 620, SPREAD = 1.32;
    const pts = Array.from({ length: 580 }, () => {
      const t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1), r = 150 + Math.random() * 190;
      return { ox: r * Math.sin(p) * Math.cos(t), oy: r * Math.sin(p) * Math.sin(t), oz: r * Math.cos(p), x: 0, y: 0, vx: 0, vy: 0 };
    });
    const setPointer = (x, y) => { mx = x; my = y; };
    const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    resize();
    addEventListener('resize', resize);
    addEventListener('mousemove', e => setPointer(e.clientX, e.clientY));
    addEventListener('touchmove', e => { if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    addEventListener('mouseleave', () => setPointer(-999, -999));
    const loop = () => {
      angle += 0.0018;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      ctx.fillStyle = 'rgba(10,10,12,0.1)'; ctx.fillRect(0, 0, W, H);
      pts.forEach(p => {
        const rx = p.ox * ca - p.oz * sa, ry = p.oy, rz = p.ox * sa + p.oz * ca;
        const sc = FOCAL / (FOCAL + rz);
        const px = W / 2 + rx * sc * SPREAD, py = H / 2 + ry * sc * SPREAD;
        const dx = px - mx, dy = py - my, dist = Math.hypot(dx, dy);
        if (dist < 120 && dist > 0) {
          const f = Math.pow((120 - dist) / 120, 1.4) * 2.8;
          p.vx += dx / dist * f; p.vy += dy / dist * f;
        }
        p.vx += (px - p.x) * 0.025 - p.vx * 0.085;
        p.vy += (py - p.y) * 0.025 - p.vy * 0.085;
        p.x += p.vx; p.y += p.vy;
        const a = Math.min(0.85, 0.15 + (rz + 350) / 700);
        const sz = 1 + sc * 1.1;
        ctx.fillStyle = `rgba(0,255,65,${a})`;
        ctx.fillRect(p.x, p.y, sz, sz);
      });
      requestAnimationFrame(loop);
    };
    loop();
  };

  /* ── Robotics decor layer ── */
  const svg = (cls, html) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('class', cls);
    n.setAttribute('viewBox', '0 0 100 100');
    n.innerHTML = html;
    return n;
  };

  const sticker = (cls, child) => el('div', { class: `bot-sticker ${cls}` }, child);

  const initDecors = () => {
    const layer = $('#bot-layer');
    if (!layer) return;

    const rover = svg('bot-svg', `
      <rect x="8" y="28" width="72" height="28" rx="3" fill="#0e1014" stroke="#00aa2a" stroke-width="2"/>
      <circle cx="22" cy="58" r="9" fill="none" stroke="#00ff41" stroke-width="2"/>
      <circle cx="58" cy="58" r="9" fill="none" stroke="#00ff41" stroke-width="2"/>
      <circle cx="22" cy="58" r="3" fill="#00ff41"/><circle cx="58" cy="58" r="3" fill="#00ff41"/>
      <rect x="38" y="14" width="12" height="14" fill="#111318" stroke="#00ff41" stroke-width="1.5"/>
      <line x1="44" y1="14" x2="44" y2="6" stroke="#00ff41" stroke-width="1.5"/>
      <circle cx="44" cy="5" r="4" fill="none" stroke="#00ff41" stroke-width="1.5"/>
      <line x1="12" y1="36" x2="22" y2="36" stroke="#7ec8e3" stroke-width="1"/>
      <line x1="12" y1="42" x2="18" y2="42" stroke="#7ec8e3" stroke-width="1"/>
    `);

    const drone = svg('bot-svg', `
      <line x1="50" y1="50" x2="20" y2="25" stroke="#00aa2a" stroke-width="2"/>
      <line x1="50" y1="50" x2="80" y2="25" stroke="#00aa2a" stroke-width="2"/>
      <line x1="50" y1="50" x2="20" y2="75" stroke="#00aa2a" stroke-width="2"/>
      <line x1="50" y1="50" x2="80" y2="75" stroke="#00aa2a" stroke-width="2"/>
      <rect x="38" y="42" width="24" height="16" rx="2" fill="#111318" stroke="#00ff41" stroke-width="1.5"/>
      <g class="drone-prop" style="transform-origin:20px 25px"><ellipse cx="20" cy="25" rx="12" ry="3" fill="none" stroke="#00ff41" stroke-width="1.2"/></g>
      <g class="drone-prop" style="transform-origin:80px 25px"><ellipse cx="80" cy="25" rx="12" ry="3" fill="none" stroke="#00ff41" stroke-width="1.2"/></g>
      <g class="drone-prop" style="transform-origin:20px 75px"><ellipse cx="20" cy="75" rx="12" ry="3" fill="none" stroke="#00ff41" stroke-width="1.2"/></g>
      <g class="drone-prop" style="transform-origin:80px 75px"><ellipse cx="80" cy="75" rx="12" ry="3" fill="none" stroke="#00ff41" stroke-width="1.2"/></g>
      <circle cx="50" cy="50" r="3" fill="#00ff41"/>
    `);

    const arm = svg('bot-svg arm-svg', `
      <rect x="10" y="78" width="28" height="8" rx="2" fill="#111318" stroke="#00aa2a" stroke-width="1.5"/>
      <g class="arm-base" style="transform-origin:24px 78px">
        <rect x="18" y="48" width="12" height="30" fill="#0e1014" stroke="#00ff41" stroke-width="1.5"/>
        <g class="arm-seg" style="transform-origin:24px 48px">
          <rect x="20" y="28" width="8" height="22" fill="#111318" stroke="#00ff41" stroke-width="1.5"/>
          <g class="arm-grip" style="transform-origin:24px 28px">
            <line x1="24" y1="28" x2="14" y2="14" stroke="#00ff41" stroke-width="2"/>
            <line x1="24" y1="28" x2="34" y2="14" stroke="#00ff41" stroke-width="2"/>
            <line x1="14" y1="14" x2="10" y2="8" stroke="#7ec8e3" stroke-width="1.5"/>
            <line x1="34" y1="14" x2="38" y2="8" stroke="#7ec8e3" stroke-width="1.5"/>
          </g>
        </g>
      </g>
      <circle cx="24" cy="78" r="4" fill="#00ff41" opacity=".6"/>
    `);

    const pcb = svg('bot-svg', `
      <rect x="10" y="10" width="80" height="80" rx="2" fill="#0a0f0a" stroke="#00aa2a" stroke-width="1.5"/>
      <line x1="20" y1="20" x2="80" y2="20" stroke="#00ff41" stroke-width=".8" opacity=".5"/>
      <line x1="20" y1="20" x2="20" y2="70" stroke="#00ff41" stroke-width=".8" opacity=".5"/>
      <line x1="20" y1="40" x2="60" y2="40" stroke="#00ff41" stroke-width=".8" opacity=".4"/>
      <line x1="40" y1="20" x2="40" y2="60" stroke="#00ff41" stroke-width=".8" opacity=".4"/>
      <line x1="60" y1="30" x2="80" y2="30" stroke="#7ec8e3" stroke-width=".8" opacity=".4"/>
      <line x1="60" y1="30" x2="60" y2="80" stroke="#7ec8e3" stroke-width=".8" opacity=".4"/>
      <rect x="24" y="48" width="14" height="14" fill="#111318" stroke="#00ff41" stroke-width="1"/>
      <rect x="52" y="48" width="18" height="10" fill="#111318" stroke="#00ff41" stroke-width="1"/>
      <rect x="52" y="62" width="10" height="8" fill="#111318" stroke="#7ec8e3" stroke-width="1"/>
      <circle cx="30" cy="30" r="2" fill="#00ff41"/><circle cx="70" cy="70" r="2" fill="#00ff41"/>
      <circle cx="75" cy="25" r="2" fill="#7ec8e3"/><circle cx="15" cy="75" r="2" fill="#7ec8e3"/>
    `);

    const sensor = svg('bot-svg', `
      <rect x="25" y="35" width="50" height="30" rx="4" fill="#111318" stroke="#00ff41" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="10" fill="none" stroke="#00ff41" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="4" fill="#00ff41" opacity=".5"/>
      <path d="M50 50 L50 24 A26 26 0 0 1 68 42 Z" fill="rgba(0,255,65,.06)" stroke="#00ff41" stroke-width=".8" opacity=".7"/>
      <text x="50" y="82" text-anchor="middle" fill="#00aa2a" font-size="10" font-family="monospace">LiDAR</text>
    `);

    const badges = ['ROS 2', 'SLAM', '/cmd_vel', 'Nav2', 'ESP32', 'I²C', 'PWM', 'MQTT', 'GPIO', 'IMU'];
    badges.forEach((txt, i) => {
      layer.append(sticker(`iot-badge iot-${i}`, el('span', {}, txt)));
    });

    layer.append(
      sticker('bot-rover', rover),
      sticker('bot-drone', drone),
      sticker('bot-arm', arm),
      sticker('bot-pcb bot-pcb-tr', pcb.cloneNode(true)),
      sticker('bot-pcb bot-pcb-bl', pcb),
      sticker('bot-sensor', sensor),
      el('div', { class: 'circuit-trace trace-1' }),
      el('div', { class: 'circuit-trace trace-2' }),
      el('div', { class: 'circuit-trace trace-3' })
    );
  };

  /* ── Lightbox ── */
  const initLightbox = () => {
    lightbox = el('div', { class: 'lightbox', id: 'lightbox', onclick: e => { if (e.target === lightbox) closeLightbox(); } },
      el('button', { class: 'lightbox-close', type: 'button', 'aria-label': 'Close', onclick: closeLightbox }, '✕'),
      el('img', { id: 'lightbox-img', alt: '' }),
      el('div', { class: 'lightbox-caption', id: 'lightbox-caption' })
    );
    document.body.append(lightbox);
    addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
  };

  const openLightbox = (src, title, desc) => {
    $('#lightbox-img').src = src;
    $('#lightbox-img').alt = title;
    $('#lightbox-caption').textContent = desc ? `${title} — ${desc}` : title;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox?.classList.remove('open');
    document.body.style.overflow = '';
  };

  /* ── Loader ── */
  const initLoader = () => {
    if ($('#loader')) return;
    document.body.classList.add('is-loading');
    document.body.append(el('div', { class: 'loader', id: 'loader' },
      el('div', { class: 'loader-inner' },
        el('p', { class: 'loader-title glitch', 'data-text': 'MARS LAB' }, 'MARS LAB'),
        el('div', { class: 'loader-bar' }, el('div', { class: 'loader-fill', id: 'loader-fill' })),
        el('p', { class: 'loader-status', id: 'loader-status' }, 'initializing…')
      )
    ));
  };

  const setLoader = (msg, pct) => {
    const status = $('#loader-status'), fill = $('#loader-fill');
    if (status) status.textContent = msg;
    if (fill) fill.style.width = `${pct}%`;
  };

  const hideLoader = () => {
    setLoader('online', 100);
    const loader = $('#loader');
    if (!loader) return;
    loader.classList.add('done');
    document.body.classList.remove('is-loading');
    setTimeout(() => loader.remove(), 550);
  };

  /* ── Helpers ── */
  const sectionIntro = (label, title, lead) => el('div', { class: 'section-intro' },
    el('p', { class: 'label' }, label),
    el('h2', { class: 'glitch', 'data-text': title }, title),
    lead ? el('p', { class: 'lead' }, lead) : null
  );

  const latestGallery = () => [...gallery].sort((a, b) => b.id - a.id).slice(0, latestLimit());

  const backHomeBtn = () => el('div', { class: 'button-row' },
    el('a', { class: 'btn', href: '#/', onclick: e => { e.preventDefault(); navigate('home'); } }, '← Back to Home')
  );

  const navClick = (e, item) => {
    e.preventDefault();
    $$('.main-nav').forEach(n => n.classList.remove('open'));
    if (item.route === 'home') navigate('home', item.section);
    else navigate(item.route);
  };

  const updateNavActive = () => {
    $$('.main-nav a').forEach(a => {
      const route = a.dataset.route;
      const section = a.dataset.section || '';
      if (state.page === 'resume' || state.page === 'gallery') {
        a.classList.toggle('active', route === state.page);
      } else {
        a.classList.toggle('active', route === 'home' && section === (state.section || 'intro'));
      }
    });
  };

  const initNav = () => {
    $('#nav-toggle')?.addEventListener('click', () => $('.main-nav')?.classList.toggle('open'));
    if (state.page !== 'home') return;
    const sections = $$('.main-nav a')
      .filter(a => a.dataset.section)
      .map(a => document.getElementById(a.dataset.section))
      .filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      if (state.page !== 'home') return;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          state.section = entry.target.id;
          updateNavActive();
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => observer.observe(s));
  };

  const initHomeTabs = () => {
    $$('.home-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        $$('.home-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
        $$('.home-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));
      });
    });
  };

  const initScrollAnimations = () => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    $$('.anim-fade-up, .timeline-block').forEach(node => observer.observe(node));
  };

  /* ── Gallery ── */
  const galleryItem = (item) => {
    const body = (title, desc) => el('div', { class: 'g-body' }, el('h4', {}, title), el('p', {}, desc));
    if (item.type === 'video') return el('div', { class: 'g-item anim-fade-up' },
      el('iframe', { src: `https://www.youtube.com/embed/${item.source}`, loading: 'lazy', allowfullscreen: '', title: item.title }),
      body(item.title, item.desc)
    );
    if (item.type === 'article') return el('a', { class: 'g-item anim-fade-up', href: item.link, target: '_blank', rel: 'noopener' },
      el('div', { class: 'article-thumb' }, el('span', { class: 'ros-badge' }, 'ARTICLE')),
      body(item.title, item.desc)
    );
    const img = el('img', { src: item.src, alt: item.title, loading: 'lazy', class: 'expandable' });
    img.addEventListener('click', () => openLightbox(item.src, item.title, item.desc));
    return el('div', { class: 'g-item g-item-photo anim-fade-up' }, img, body(item.title, item.desc));
  };

  function renderGallery(filter = 'all') {
    galleryFilter = filter;
    if (!galleryGrid) return;
    galleryGrid.replaceChildren();
    const items = filter === 'all' ? gallery : gallery.filter(i => i.type === filter);
    items.forEach(i => galleryGrid.append(galleryItem(i)));
    $$('.gallery-page .filter-bar button').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    initScrollAnimations();
  }

  /* ── Components ── */
  const Header = () => el('header', { class: 'site-header' },
    el('div', { class: 'header-inner' },
      el('div', { class: 'logo' },
        el('a', { href: '#/', onclick: e => { e.preventDefault(); navigate('home'); } }, 'My Profile')
      ),
      el('button', { class: 'nav-toggle', id: 'nav-toggle', type: 'button', 'aria-label': 'Toggle menu' }, 'Menu'),
      el('nav', { class: 'main-nav' },
        el('ul', {}, ...NAV.map(n =>
          el('li', {}, el('a', {
            href: n.route === 'home' ? `#/${n.section || 'intro'}` : `#/${n.route}`,
            'data-route': n.route,
            'data-section': n.section || '',
            onclick: e => navClick(e, n)
          }, n.label))
        ))
      )
    )
  );

  const Intro = () => el('section', { id: 'intro' },
    el('div', { class: 'intro-content' },
      el('p', { class: 'greeting' }, resume.intro.greeting),
      el('h1', { class: 'glitch', 'data-text': resume.intro.headline }, resume.intro.headline),
      el('p', { class: 'fullname' }, `(${resume.name})`),
      el('div', { class: 'intro-positions' }, ...resume.intro.positions.map(p => el('span', {}, p))),
      el('a', { class: 'btn', href: '#/about', onclick: e => { e.preventDefault(); navigate('home', 'about'); } }, 'More About Me'),
      el('ul', { class: 'intro-social' }, ...resume.social.map(s =>
        el('li', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label))
      ))
    )
  );

  const HomeLatest = () => {
    const latest = latestGallery();
    const tabs = [
      { id: 'latest', label: 'Latest Work' },
      { id: 'videos', label: 'Videos' },
      { id: 'photos', label: 'Photos' }
    ];
    const panelItems = {
      latest,
      videos: latest.filter(i => i.type === 'video'),
      photos: latest.filter(i => i.type === 'photo')
    };
    return el('section', { id: 'home-latest', class: 'home-latest alt' },
      sectionIntro('Recent', 'Latest From the Lab.', 'Fresh demos, articles, and field photos from MARS Lab.'),
      el('div', { class: 'home-tabs' },
        ...tabs.map(t => el('button', { type: 'button', class: `home-tab${t.id === 'latest' ? ' active' : ''}`, 'data-tab': t.id }, t.label))
      ),
      ...tabs.map(t => el('div', { class: `home-tab-panel${t.id === 'latest' ? ' active' : ''}`, 'data-panel': t.id },
        el('div', { class: 'gallery-grid compact' },
          ...(panelItems[t.id].length ? panelItems[t.id].map(i => galleryItem(i)) : [el('p', { class: 'empty-tab' }, 'Nothing here yet.')])
        )
      )),
      el('div', { class: 'button-row' },
        el('a', { class: 'btn btn-primary', href: '#/gallery', onclick: e => { e.preventDefault(); navigate('gallery'); } }, 'Check Out More in My Gallery →')
      )
    );
  };

  const About = () => el('section', { id: 'about' },
    sectionIntro('About Me', 'Let me introduce myself.', resume.summary),
    el('div', { class: 'about-grid' },
      el('div', {},
        el('div', { class: 'about-photo scan-frame' }, el('img', { src: resume.avatar, alt: resume.name, loading: 'lazy' })),
        el('ul', { class: 'info-list' },
          el('li', {}, el('strong', {}, 'Fullname:'), el('span', {}, resume.name)),
          el('li', {}, el('strong', {}, 'Role:'), el('span', {}, resume.role)),
          el('li', {}, el('strong', {}, 'Email:'), el('span', {}, resume.contact.email)),
          el('li', {}, el('strong', {}, 'Location:'), el('span', {}, resume.contact.location)),
          el('li', {}, el('strong', {}, 'OS:'), el('span', {}, 'Ubuntu / Arch Linux'))
        )
      ),
      el('div', {},
        el('div', { class: 'col-block' },
          el('h3', {}, 'Profile'),
          el('p', { class: 'lead' }, resume.summary)
        ),
        el('div', { class: 'col-block' },
          el('h3', {}, 'Expertise Areas'),
          ...resume.skills.map(s => el('div', { class: 'skill-group anim-fade-up' },
            el('p', { class: 'skill-cat-label' }, s.cat),
            el('div', { class: 'skill-list' }, ...s.items.map(i => el('span', {}, i)))
          ))
        )
      )
    ),
    el('div', { class: 'button-row' },
      el('a', { class: 'btn', href: '#/contact', onclick: e => { e.preventDefault(); navigate('home', 'contact'); } }, 'Hire Me'),
      el('a', { class: 'btn', href: '#/resume', onclick: e => { e.preventDefault(); navigate('resume'); } }, 'More of My Experiences'),
      el('a', { class: 'btn btn-primary', href: resume.cv, target: '_blank', rel: 'noopener' }, 'Download CV')
    )
  );

  const TimelineBlock = (item, isEdu = false) => el('div', { class: 'timeline-block anim-fade-up' },
    el('h3', {}, isEdu ? item.degree : item.title),
    el('p', { class: 'period' }, item.period),
    el('h4', {}, isEdu ? item.school : item.org),
    isEdu ? null : el('ul', {}, ...(item.bullets || []).map(b => el('li', {}, b)))
  );

  const ResumePage = () => el('main', { class: 'page page-standalone' },
    el('section', { class: 'resume-page alt' },
      sectionIntro('Resume', 'More of my experiences.', 'Work across robotics labs, internships, and open-source communities.'),
      el('div', { class: 'grid-2' },
        el('div', {},
          el('h3', { class: 'sub-head' }, 'Work Experience'),
          el('div', { class: 'timeline' }, ...resume.experience.map(e => TimelineBlock(e)))
        ),
        el('div', {},
          el('h3', { class: 'sub-head' }, 'Education'),
          el('div', { class: 'timeline' }, ...resume.education.map(e => TimelineBlock(e, true)))
        )
      )
    ),
    backHomeBtn(),
    Footer()
  );

  const GalleryPage = () => {
    galleryGrid = el('div', { class: 'gallery-grid', id: 'gallery-grid' });
    const filters = ['all', 'video', 'article', 'photo'];
    return el('main', { class: 'page page-standalone gallery-page' },
      el('section', {},
        sectionIntro('Gallery', 'Check Out Some of My Works.', 'Robotics demos, technical articles, and lab photography.'),
        el('div', { class: 'filter-bar' },
          ...filters.map(f => el('button', {
            type: 'button', 'data-filter': f,
            class: f === galleryFilter ? 'active' : '',
            onclick: () => renderGallery(f)
          }, f))
        ),
        galleryGrid
      ),
      backHomeBtn(),
      Footer()
    );
  };

  const SystemctlRepos = () => {
    const wrap = el('div', { class: 'systemctl' });
    repos.slice(0, repoLimit()).forEach(r => {
      wrap.append(
        el('div', { class: 'unit anim-fade-up' },
          el('a', { class: 'repo-link', href: r.html_url, target: '_blank', rel: 'noopener' }, `${r.name}.service — loaded/active`)
        ),
        el('div', { class: 'detail' }, `Language: ${r.language || 'N/A'} | ★ ${r.stargazers_count} | Forks: ${r.forks_count}`),
        el('div', { class: 'detail' }, r.description || 'No description')
      );
    });
    return wrap;
  };

  const Projects = () => el('section', { id: 'projects', class: 'alt' },
    sectionIntro('Projects', 'Latest on GitHub.', 'Top repositories — ROS 2, SLAM, perception, and embedded systems.'),
    SystemctlRepos()
  );

  const ContactForm = () => el('form', { class: 'contact-form', action: FORMSPREE, method: 'POST' },
    el('div', { class: 'form-row' },
      el('label', {}, 'Name', el('input', { type: 'text', name: 'name', required: '', placeholder: 'Your name', autocomplete: 'name' })),
      el('label', {}, 'Email', el('input', { type: 'email', name: 'email', required: '', placeholder: 'you@email.com', autocomplete: 'email' }))
    ),
    el('label', {}, 'Message', el('textarea', { name: 'message', required: '', rows: '5', placeholder: 'Tell me about your project…' })),
    el('button', { type: 'submit', class: 'btn btn-primary' }, 'Send Message')
  );

  const Contact = () => el('section', { id: 'contact' },
    sectionIntro('Contact', 'Get In Touch.', 'Open to robotics, edge AI, and embedded systems collaborations.'),
    el('div', { class: 'contact-layout' },
      el('div', { class: 'contact-info' },
        el('div', { class: 'contact-grid' },
          el('div', { class: 'contact-card anim-fade-up' }, el('h4', {}, 'Email'), el('a', { href: `mailto:${resume.contact.email}` }, resume.contact.email)),
          el('div', { class: 'contact-card anim-fade-up' }, el('h4', {}, 'Location'), el('p', {}, resume.contact.location)),
          el('div', { class: 'contact-card anim-fade-up' }, el('h4', {}, 'GitHub'), el('a', { href: resume.contact.github, target: '_blank', rel: 'noopener' }, 'hermanumrao')),
          el('div', { class: 'contact-card anim-fade-up' }, el('h4', {}, 'LinkedIn'), el('a', { href: resume.contact.linkedin, target: '_blank', rel: 'noopener' }, 'herman-singh-umrao'))
        ),
        el('ul', { class: 'intro-social' }, ...resume.social.map(s =>
          el('li', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label))
        ))
      ),
      ContactForm()
    )
  );

  const Footer = () => el('footer', { class: 'site-footer' },
    el('p', {}, `© ${new Date().getFullYear()} ${resume.name} — Built with ROS 2 spirit`)
  );

  const HomePage = () => el('main', { class: 'page' },
    Intro(), HomeLatest(), About(), Projects(), Contact(), Footer()
  );

  function renderApp() {
    const content = state.page === 'resume' ? ResumePage()
      : state.page === 'gallery' ? GalleryPage()
      : HomePage();
    $('#app').replaceChildren(Header(), content);
    updateNavActive();
    if (state.page === 'gallery') renderGallery(galleryFilter);
    if (state.page === 'home') { initHomeTabs(); initScrollAnimations(); initNav(); }
    else { initScrollAnimations(); }
  }

  const boot = async () => {
    initLoader();
    setLoader('starting canvas…', 8);
    initCanvas();
    initDecors();
    initLightbox();
    addEventListener('hashchange', () => applyRoute(true));
    MOBILE_MQ.addEventListener('change', () => {
      if (state.page === 'home' && resume) renderApp();
    });
    try {
      setLoader('loading profile & gallery…', 30);
      [resume, gallery] = await Promise.all([
        fetch('./resume.json').then(x => x.json()),
        fetch('./gallery.json').then(x => x.json())
      ]);
    } catch (e) {
      hideLoader();
      $('#app').append(el('p', { style: 'padding:2rem;color:#f55' }, `Failed to load data: ${e.message}`));
      return;
    }
    try {
      setLoader('syncing github repos…', 65);
      const data = await fetch('https://api.github.com/users/hermanumrao/repos?per_page=100&sort=updated').then(x => x.json());
      repos = Array.isArray(data) ? data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)) : [];
    } catch { repos = []; }
    setLoader('rendering interface…', 90);
    if (!location.hash) location.hash = '#/';
    applyRoute(true);
    requestAnimationFrame(() => hideLoader());
  };

  boot();
})();
