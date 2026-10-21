// Casa Kokob: cotizador, enlaces de WhatsApp, formulario y animaciones.
(function () {
  'use strict';

  var WHATSAPP = '524425856551';
  var APARTADO = 3000;
  var root = document.documentElement;

  // ---------- Lista de precios · Etapa 2 ----------
  // Precio por m² de cada plan. El 70/30 paga 70 % de enganche y 30 % como saldo final;
  // los planes a meses pagan 15 % de enganche y el resto en mensualidades iguales.
  var PLANES = [
    { id: '70/30', nombre: '70/30', meses: 0, enganche: 0.70 },
    { id: '18', nombre: '18 meses', meses: 18, enganche: 0.15 },
    { id: '36', nombre: '36 meses', meses: 36, enganche: 0.15 },
    { id: '48', nombre: '48 meses', meses: 48, enganche: 0.15 },
    { id: '60', nombre: '60 meses', meses: 60, enganche: 0.15 }
  ];
  var PRECIO_M2_REGULAR = { '70/30': 850, '18': 920, '36': 980, '48': 1200, '60': 1260 };
  var LOTES = [
    { id: '160', nombre: '160 m²', m2: 160, precios: PRECIO_M2_REGULAR },
    { id: '180', nombre: '180 m²', m2: 180, precios: PRECIO_M2_REGULAR },
    { id: '200', nombre: '200 m²', m2: 200, precios: PRECIO_M2_REGULAR },
    { id: 'esq200', nombre: 'Esquina 200 m²', m2: 200, precios: { '70/30': 950, '18': 1050, '36': 1100, '48': 1260, '60': 1320 } }
  ];

  function calcular(lote, plan) {
    var m2 = lote.precios[plan.id];
    var total = m2 * lote.m2;
    var enganche = Math.round(total * plan.enganche);
    var saldo = total - enganche;
    var mensualidad = plan.meses ? Math.round(saldo / plan.meses * 100) / 100 : 0;
    return { m2: m2, total: total, enganche: enganche, saldo: saldo, mensualidad: mensualidad };
  }

  var fmt0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  function pesos(n, decimales) { return (decimales ? fmt2 : fmt0).format(n).replace('MX', ''); }

  function waUrl(mensaje) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensaje); }

  document.querySelectorAll('[data-wa]').forEach(function (a) { a.href = waUrl(a.getAttribute('data-wa')); });

  // ---------- Cotizador ----------
  var cotLotes = document.getElementById('cot-lotes');
  var cotPlanes = document.getElementById('cot-planes');
  var estado = { lote: LOTES[0], plan: PLANES[4] };
  var montoMostrado = 0;

  function resumen(lote, plan, r) {
    var texto = 'Lote ' + lote.nombre + ', plan ' + plan.nombre + ' (' + pesos(r.m2) + ' por m²). Precio total ' + pesos(r.total) + ', ';
    if (plan.meses) {
      texto += 'enganche ' + pesos(r.enganche) + ' y ' + plan.meses + ' mensualidades de ' + pesos(r.mensualidad, true) + '.';
    } else {
      texto += 'enganche 70 % ' + pesos(r.enganche) + ' y saldo final 30 % ' + pesos(r.saldo) + '.';
    }
    return texto;
  }

  function pintarLotes() {
    cotLotes.innerHTML = LOTES.map(function (l, i) {
      var desde = calcular(l, PLANES[4]).mensualidad;
      return '<label class="chip"><input type="radio" name="cot-lote" value="' + l.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span>' + l.nombre + '<small>desde ' + pesos(desde) + '/mes</small></span></label>';
    }).join('');
  }

  function pintarPlanes() {
    cotPlanes.innerHTML = PLANES.map(function (p) {
      var r = calcular(estado.lote, p);
      var etiqueta = p.id === '70/30' ? '<span class="etiqueta">Mejor precio</span>' : p.id === '60' ? '<span class="etiqueta">Menor mensualidad</span>' : '';
      var derecha = p.meses
        ? pesos(r.mensualidad) + '<small>al mes</small>'
        : pesos(r.enganche) + '<small>enganche 70 %</small>';
      var sub = p.meses ? 'Enganche 15 % · ' + pesos(r.m2) + '/m²' : 'Saldo final 30 % · ' + pesos(r.m2) + '/m²';
      return '<label class="plan"><input type="radio" name="cot-plan" value="' + p.id + '"' + (p === estado.plan ? ' checked' : '') + '>' +
        '<span><b>' + p.nombre + etiqueta + '</b><em>' + derecha + '</em><i>' + sub + '</i></span></label>';
    }).join('');
  }

  function animarMonto(destino, decimales) {
    var el = document.getElementById('res-monto');
    if (window.gsap && !root.classList.contains('no-anim')) {
      var obj = { v: montoMostrado };
      gsap.to(obj, { v: destino, duration: 0.7, ease: 'power3.out', overwrite: true,
        onUpdate: function () { el.textContent = pesos(obj.v, decimales); } });
    } else {
      el.textContent = pesos(destino, decimales);
    }
    montoMostrado = destino;
  }

  function pintarResultado() {
    var lote = estado.lote, plan = estado.plan, r = calcular(lote, plan);
    var set = function (id, v) { document.getElementById(id).textContent = v; };

    if (plan.meses) {
      set('res-titulo', 'Tu mensualidad');
      animarMonto(r.mensualidad, true);
      set('res-sufijo', 'durante ' + plan.meses + ' meses · ' + lote.nombre);
      set('res-eng-label', 'Enganche (15 %)');
      set('res-saldo-label', 'A financiar');
    } else {
      set('res-titulo', 'Tu enganche (70 %)');
      animarMonto(r.enganche, false);
      set('res-sufijo', 'y 30 % como saldo final · ' + lote.nombre);
      set('res-eng-label', 'Enganche (70 %)');
      set('res-saldo-label', 'Saldo final (30 %)');
    }
    set('res-m2', pesos(r.m2));
    set('res-total', pesos(r.total));
    set('res-enganche', pesos(r.enganche));
    set('res-saldo', pesos(r.saldo));

    var ahorro = document.getElementById('res-ahorro');
    var r60 = calcular(lote, PLANES[4]), r7030 = calcular(lote, PLANES[0]);
    if (plan.id === '60') {
      ahorro.innerHTML = 'Con el plan 70/30 este mismo lote cuesta <b>' + pesos(r60.total - r7030.total) + ' menos</b>.';
    } else {
      ahorro.innerHTML = 'Con este plan pagas <b>' + pesos(r60.total - r.total) + ' menos</b> que a 60 meses.';
    }

    document.getElementById('cot-wa').href = waUrl('Hola, quiero apartar un lote en Casa Kokob. Mi cotización: ' + resumen(lote, plan, r) + ' ¿Qué lotes tienen disponibles?');
  }

  if (cotLotes && cotPlanes) {
    pintarLotes();
    pintarPlanes();
    pintarResultado();

    cotLotes.addEventListener('change', function (e) {
      estado.lote = LOTES.filter(function (l) { return l.id === e.target.value; })[0];
      pintarPlanes();
      pintarResultado();
    });
    cotPlanes.addEventListener('change', function (e) {
      estado.plan = PLANES.filter(function (p) { return p.id === e.target.value; })[0];
      pintarResultado();
    });

    // Lleva la cotización elegida al formulario
    document.getElementById('cot-correo').addEventListener('click', function () {
      document.getElementById('form-lote').value = estado.lote.nombre;
      document.getElementById('form-plan').value = estado.plan.nombre;
    });

    // Tablas completas
    document.getElementById('tablas').innerHTML = LOTES.map(function (l) {
      var filas = PLANES.map(function (p) {
        var r = calcular(l, p);
        return '<tr><td>' + p.nombre + '</td><td>' + pesos(r.m2) + '</td><td>' + pesos(r.total) + '</td><td>' + pesos(r.enganche) + '</td><td>' +
          (p.meses ? pesos(r.mensualidad, true) : pesos(r.saldo) + ' saldo final') + '</td></tr>';
      }).join('');
      return '<div class="tabla"><h3>Etapa 2 · ' + l.nombre + '</h3><div class="tabla-scroll"><table>' +
        '<thead><tr><th>Plan</th><th>Precio m²</th><th>Precio total</th><th>Enganche</th><th>Mensualidad / saldo</th></tr></thead>' +
        '<tbody>' + filas + '</tbody></table></div></div>';
    }).join('');
  }

  // ---------- Formulario ----------
  var form = document.getElementById('form');
  if (form) {
    var status = document.getElementById('form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      var requeridos = ['nombre', 'telefono', 'email'];
      var invalidos = requeridos.filter(function (n) {
        var campo = form.elements[n];
        var malo = !campo.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value.trim()));
        campo.classList.toggle('invalido', malo);
        return malo;
      });
      if (invalidos.length) {
        status.className = 'form-status error';
        status.textContent = 'Revisa tu nombre, teléfono y correo.';
        form.elements[invalidos[0]].focus();
        return;
      }

      var lote = LOTES.filter(function (l) { return l.nombre === form.elements.lote.value; })[0];
      var plan = PLANES.filter(function (p) { return p.nombre === form.elements.plan.value; })[0];
      document.getElementById('form-cotizacion').value = lote && plan ? resumen(lote, plan, calcular(lote, plan)) : '';

      var boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;
      boton.textContent = 'Enviando…';

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || 'Error');
          form.reset();
          status.className = 'form-status ok';
          status.innerHTML = '¡Gracias! Un asesor te contactará muy pronto. Si quieres apartar ya, <a href="' +
            waUrl('Hola, acabo de enviar mis datos en la página de Casa Kokob y quiero apartar mi lote.') + '" target="_blank" rel="noopener">escríbenos por WhatsApp</a>.';
        })
        .catch(function () {
          status.className = 'form-status error';
          status.innerHTML = 'No pudimos enviar tus datos. Escríbenos directo por <a href="' +
            waUrl('Hola, quiero información de Casa Kokob.') + '" target="_blank" rel="noopener">WhatsApp al 442 585 6551</a>.';
        })
        .then(function () {
          boton.disabled = false;
          boton.textContent = 'Quiero mi cotización';
        });
    });
  }

  // ---------- Menú, encabezado y barra móvil ----------
  var header = document.getElementById('header');
  var menuMovil = document.getElementById('menu-movil');
  var toggle = document.querySelector('.menu-toggle');
  var barra = document.querySelector('.barra-movil');
  var hero = document.getElementById('inicio');

  function menuAbierto() { return root.classList.contains('menu-abierto'); }
  function abrirMenu(abrir) {
    if (abrir) menuMovil.hidden = false;
    // Un cuadro de espera para que la transición arranque después de quitar "hidden"
    requestAnimationFrame(function () {
      root.classList.toggle('menu-abierto', abrir);
      if (window.__lenis) window.__lenis[abrir ? 'stop' : 'start']();
    });
    toggle.setAttribute('aria-expanded', String(abrir));
    toggle.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    if (!abrir) setTimeout(function () { if (!menuAbierto()) menuMovil.hidden = true; }, 700);
  }
  toggle.addEventListener('click', function () { abrirMenu(!menuAbierto()); });
  menuMovil.addEventListener('click', function (e) { if (e.target.closest('a')) abrirMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuAbierto()) abrirMenu(false); });

  var ultimoY = 0;
  function alHacerScroll() {
    var y = window.scrollY;
    var pasoHero = y > hero.offsetHeight - 120;
    header.classList.toggle('compacto', y > 40);
    if (pasoHero && y > ultimoY + 4 && !menuAbierto()) header.classList.add('oculto');
    if (y < ultimoY - 4 || !pasoHero) header.classList.remove('oculto');
    if (barra) barra.classList.toggle('visible', y > hero.offsetHeight * 0.6);
    ultimoY = y;
  }
  window.addEventListener('scroll', alHacerScroll, { passive: true });
  alHacerScroll();

  // Marca en el menú la sección que se está viendo
  var enlacesNav = document.querySelectorAll('.main-nav a');
  if ('IntersectionObserver' in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        enlacesNav.forEach(function (a) { a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (sec) { observador.observe(sec); });
  }

  var waFloat = document.querySelector('.wa-float');
  setTimeout(function () {
    waFloat.classList.add('saludo');
    setTimeout(function () { waFloat.classList.remove('saludo'); }, 5000);
  }, 7000);

  // ---------- Video ----------
  var video = document.getElementById('video');
  if (video) {
    var marco = video.parentElement;
    marco.querySelector('.video-play').addEventListener('click', function () {
      video.controls = true;
      video.play();
    });
    video.addEventListener('play', function () { marco.classList.add('reproduciendo'); });
    video.addEventListener('pause', function () { marco.classList.remove('reproduciendo'); });
    video.addEventListener('ended', function () { marco.classList.remove('reproduciendo'); });
  }

  // ---------- Animaciones ----------
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || sinMovimiento) {
    root.classList.add('no-anim');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Scroll suave
  if (window.Lenis) {
    var lenis = window.__lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var destino = document.querySelector(a.getAttribute('href'));
        if (!destino) return;
        e.preventDefault();
        lenis.start();
        lenis.scrollTo(destino, { offset: a.getAttribute('href') === '#inicio' ? 0 : -80, duration: 1.4, force: true });
      });
    });
  }

  // Portada
  var intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro.from('.hero-media img', { scale: 1.2, duration: 2.6, ease: 'power3.out' })
    .from('.hero-title .line > span', { yPercent: 110, duration: 1.3, stagger: 0.12 }, 0.2)
    .from('.hero-anim', { y: 30, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.45)
    .from('.header-bar', { y: -20, opacity: 0, duration: 1.2, clearProps: 'transform' }, 0.5)
    .fromTo('.topbar', { opacity: 0 }, { opacity: 1, duration: 1, clearProps: 'opacity' }, 0.5);

  gsap.to('.hero-media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { y: -60, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  // Contadores
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var fin = parseFloat(el.getAttribute('data-count'));
    var conSeparador = el.hasAttribute('data-sep');
    var obj = { v: 0 };
    gsap.to(obj, {
      v: fin, duration: 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: function () { el.textContent = conSeparador ? Math.round(obj.v).toLocaleString('es-MX') : Math.round(obj.v); }
    });
  });

  // Manifiesto palabra por palabra
  var manifiesto = document.querySelector('[data-words]');
  if (manifiesto) {
    manifiesto.innerHTML = manifiesto.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.to(manifiesto.querySelectorAll('.w'), {
      opacity: 1, stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: manifiesto, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
    gsap.from('.manifiesto-arbol', { scale: 0.6, opacity: 0, rotate: -8, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.manifiesto', start: 'top 75%' } });
  }

  // Entradas
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%', once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }); }
  });
  document.querySelectorAll('.clip-reveal').forEach(function (el) {
    gsap.to(el, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 82%' } });
    var img = el.querySelector('img');
    if (img) gsap.from(img, { scale: 1.25, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 82%' } });
  });
  gsap.fromTo('.proyecto-media img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.proyecto', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.proyecto-card', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.proyecto-card', start: 'top 85%' } });

  // Amenidades: recorrido horizontal fijado en pantallas grandes
  var mm = gsap.matchMedia();
  mm.add('(min-width: 1081px)', function () {
    var track = document.querySelector('.amenidades-track');
    var distancia = function () { return track.scrollWidth - window.innerWidth; };
    track.style.overflow = 'visible';
    var tween = gsap.to(track, {
      x: function () { return -distancia(); }, ease: 'none',
      scrollTrigger: { trigger: '.amenidades', start: 'top top', end: function () { return '+=' + distancia(); }, pin: true, scrub: 1, invalidateOnRefresh: true }
    });
    gsap.utils.toArray('.amenidad img').forEach(function (img) {
      gsap.fromTo(img, { xPercent: -8, scale: 1.15 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return function () { track.style.overflow = ''; };
  });
  gsap.from('.amenidad', { y: 60, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.amenidades', start: 'top 70%' } });

  // Cotizador
  gsap.from('.cotizador-box', { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.cotizador-box', start: 'top 85%' } });

  // Proceso: la línea se llena al bajar
  var pasos = document.querySelector('.pasos');
  gsap.fromTo(pasos, { '--progreso': 0 }, { '--progreso': 1, ease: 'none', scrollTrigger: { trigger: pasos, start: 'top 75%', end: 'bottom 60%', scrub: true } });
  gsap.from('.paso', { y: 40, opacity: 0, duration: 1, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: pasos, start: 'top 80%' } });

  // Contacto
  gsap.from('.contacto-logo', { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.contacto', start: 'top 70%' } });
  gsap.from('.form', { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.form', start: 'top 85%' } });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
