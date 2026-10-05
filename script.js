// ---- Opening (letter-unfold) animation ----
const cover = document.getElementById('cover');
const main = document.getElementById('main');
document.documentElement.classList.add('locked');

// ---- Background music setup ----
const audio = document.getElementById('bg-music');
const muteBtn = document.getElementById('mute-btn');
const iconSound = document.getElementById('icon-sound');
const iconMuted = document.getElementById('icon-muted');

let musicStarted = false; // becomes true only once play() actually succeeds
let opened = false;       // guards against openInvite() running more than once

// Single source of truth for starting music. Safe to call repeatedly —
// it only marks success once the promise actually resolves, so an early
// failed attempt (e.g. a gesture that doesn't count on some browsers)
// never blocks a later, better attempt.
function tryPlayMusic() {
  if (musicStarted) return;
  audio.volume = 0.45;
  audio.play().then(() => {
    musicStarted = true;
  }).catch(() => {
    // still blocked — a later user gesture will try again
  });
}

function openInvite() {
  if (opened) return; // prevent double-fire from bubbling touch/click events
  opened = true;

  cover.classList.add('open');
  main.classList.add('show');
  document.documentElement.classList.remove('locked');
  setTimeout(() => {
    cover.classList.add('hidden');
  }, 1250);

  // This tap is a guaranteed trusted gesture — best chance for audio to start
  tryPlayMusic();
}

// Only one listener needed on the outer cover — tapToOpen is inside it,
// so a tap anywhere on the cover (including the seal) already bubbles here.
cover.addEventListener('click', openInvite);
cover.addEventListener('touchend', (e) => {
  if (e.target.closest('#mute-btn')) return; // let the mute button handle its own taps
  e.preventDefault();
  openInvite();
}, { passive: false });

// ---- Countdown timer ----
// Target date: October 24, 2026 at 11:00 AM IST (UTC+5:30)
const target = new Date('2026-10-24T11:00:00+05:30').getTime();

function tick() {
  const now = Date.now();
  let diff = Math.max(0, target - now);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const pad = n => String(n).padStart(2, '0');

  document.getElementById('cd-days').textContent = pad(d);
  document.getElementById('cd-hours').textContent = pad(h);
  document.getElementById('cd-mins').textContent = pad(m);
  document.getElementById('cd-secs').textContent = pad(s);
}

tick();
setInterval(tick, 1000);

// ---- Background music: additional fallback attempts ----
// Covers people who scroll or tap elsewhere before hitting "tap to open"
// (e.g. if opened is somehow already true from a prior state).
document.addEventListener('click', tryPlayMusic, { once: true });
document.addEventListener('scroll', tryPlayMusic, { once: true, passive: true });
document.addEventListener('touchstart', tryPlayMusic, { once: true, passive: true });

// Also try immediate autoplay on load (works on some desktop browsers,
// almost always blocked on mobile — that's fine, the gesture-based
// attempts above are the real path on phones).
window.addEventListener('load', tryPlayMusic);

// ---- Mute / unmute toggle ----
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // don't let this bubble to cover's click/touchend
  tryPlayMusic();
  if (audio.paused) {
    audio.play().catch(() => {});
    iconSound.style.display = '';
    iconMuted.style.display = 'none';
  } else {
    audio.pause();
    iconSound.style.display = 'none';
    iconMuted.style.display = '';
  }
});

// ---- Add to Calendar (downloads an .ics file; opens in Apple/Google/Outlook calendars) ----
const CAL_EVENTS = {
  ceremony: {
    title: 'Wedding Ceremony — Jino & Aleena',
    start: '20261024T053000Z', // 11:00 AM IST
    end:   '20261024T073000Z', // 1:00 PM IST
    location: "St. John's the Baptist Church, Thumba, Trivandrum",
    description: 'Wedding ceremony of Jino & Aleena.'
  },
  reception: {
    title: 'Wedding Reception — Jino & Aleena',
    start: '20261025T113000Z', // 5:00 PM IST
    end:   '20261025T143000Z', // 8:00 PM IST
    location: 'At Home',
    description: 'Wedding reception of Jino & Aleena. Location: https://www.google.com/maps/search/?api=1&query=9.488944,76.392833',
    geo: '9.488944;76.392833'
  }
};

function downloadICS(key) {
  const ev = CAL_EVENTS[key];
  const esc = s => s.replace(/[\\,;]/g, m => '\\' + m);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jino and Aleena//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + key + '-jino-aleena-2026@wedding-invitation',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    'DTSTART:' + ev.start,
    'DTEND:' + ev.end,
    'SUMMARY:' + esc(ev.title),
    'LOCATION:' + esc(ev.location),
    'DESCRIPTION:' + esc(ev.description),
    ...(ev.geo ? ['GEO:' + ev.geo] : []),
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jino-aleena-' + key + '.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

document.querySelectorAll('.cal-btn').forEach(btn => {
  btn.addEventListener('click', () => downloadICS(btn.dataset.event));
});

// ---- Gallery 3D Tilt & Lightbox Carousel ----
const galleryModal = document.getElementById('gallery-modal');
const galleryCards = Array.from(document.querySelectorAll('.gallery-card'));

if (galleryCards.length > 0) {
  // 3D Tilt and Specular Glare Physics on Desktop
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    galleryCards.forEach(card => {
      const glare = card.querySelector('.card-glare');
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotX = (0.5 - y) * 10;
        const rotY = (x - 0.5) * 10;
        card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-10px) scale(1.02)`;
        if (glare) {
          glare.style.background = `radial-gradient(circle at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%, rgba(255,255,255,0.48) 0%, transparent 60%)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        if (glare) glare.style.background = '';
      });
    });
  }

  // Lightbox Carousel
  if (galleryModal) {
    const modalImg = galleryModal.querySelector('.gallery-modal-img');
    const modalCaption = galleryModal.querySelector('.gallery-modal-caption');
    const modalSub = galleryModal.querySelector('.gallery-modal-sub');
    const closeBtn = galleryModal.querySelector('.gallery-modal-close');
    const backdrop = galleryModal.querySelector('.gallery-modal-backdrop');
    const prevBtn = document.getElementById('gallery-prev-btn');
    const nextBtn = document.getElementById('gallery-next-btn');
    const currentIdxEl = document.getElementById('gallery-current-idx');
    const totalIdxEl = document.getElementById('gallery-total-idx');

    const galleryData = galleryCards.map(card => ({
      src: card.getAttribute('data-full'),
      caption: card.getAttribute('data-caption') || 'Jino & Aleena',
      sub: card.getAttribute('data-sub') || 'Captured Moments'
    }));

    if (totalIdxEl) totalIdxEl.textContent = galleryData.length;

    let activeIdx = 0;

    function renderPhoto(index, smoothTransition = true) {
      activeIdx = (index + galleryData.length) % galleryData.length;
      const item = galleryData[activeIdx];

      if (currentIdxEl) currentIdxEl.textContent = activeIdx + 1;

      if (smoothTransition && modalImg.src) {
        modalImg.classList.add('changing');
        setTimeout(() => {
          modalImg.src = item.src;
          if (modalCaption) modalCaption.textContent = item.caption;
          if (modalSub) modalSub.textContent = item.sub;
          modalImg.onload = () => modalImg.classList.remove('changing');
          // Fallback in case image is already cached
          setTimeout(() => modalImg.classList.remove('changing'), 150);
        }, 180);
      } else {
        modalImg.src = item.src;
        if (modalCaption) modalCaption.textContent = item.caption;
        if (modalSub) modalSub.textContent = item.sub;
      }
    }

    function openModal(index) {
      renderPhoto(index, false);
      galleryModal.classList.add('active');
      galleryModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      galleryModal.classList.remove('active');
      galleryModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!galleryModal.classList.contains('active')) {
          modalImg.src = '';
        }
      }, 350);
    }

    galleryCards.forEach((card, idx) => {
      card.addEventListener('click', () => openModal(idx));
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderPhoto(activeIdx - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderPhoto(activeIdx + 1);
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!galleryModal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') renderPhoto(activeIdx - 1);
      if (e.key === 'ArrowRight') renderPhoto(activeIdx + 1);
    });

    // Touch swipe gestures on mobile
    let touchStartX = 0;
    let touchStartY = 0;

    galleryModal.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    galleryModal.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        // Check if primarily a horizontal swipe
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            renderPhoto(activeIdx + 1); // Swipe left -> next
          } else {
            renderPhoto(activeIdx - 1); // Swipe right -> prev
          }
        }
      }
    }, { passive: true });
  }
}


