/* Lari MVP — форматы: бокс 300 г, блок 1 кг, ассорти 1.2 кг. Мин. заказ 900 г, сбор партии 8 кг. */
(function () {
  'use strict';
  var D = window.LARI;
  var CART_KEY = 'lari_cart_v3', BATCH_KEY = 'lari_batch_v3', ORDERS_KEY = 'lari_orders_v3';

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function rub(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
  function kg(g) { return (g / 1000).toFixed(1).replace('.', ',') + ' кг'; }
  function baseById(id) { return D.bases.filter(function (b) { return b.id === id; })[0]; }
  function flavorById(id) { return D.flavors.filter(function (f) { return f.id === id; })[0]; }
  function fmtById(id) { return D.formats.filter(function (f) { return f.id === id; })[0]; }

  function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
  function loadBatch() { try { var v = parseInt(localStorage.getItem(BATCH_KEY), 10); return isNaN(v) ? D.batchStartG : v; } catch (e) { return D.batchStartG; } }
  function saveBatch() { try { localStorage.setItem(BATCH_KEY, String(batchG)); } catch (e) {} }
  var cart = loadCart(), batchG = loadBatch();

  function itemWeight(it) { return (it.kind === 'assorti' ? D.assorti.sizeG : fmtById(it.formatId).sizeG) * it.qty; }
  function itemPrice(it) { return (it.kind === 'assorti' ? D.assorti.price : fmtById(it.formatId).price) * it.qty; }
  function totalWeight() { return cart.reduce(function (s, it) { return s + itemWeight(it); }, 0); }
  function totalPrice() { return cart.reduce(function (s, it) { return s + itemPrice(it); }, 0); }
  function totalUnits() { return cart.reduce(function (s, it) { return s + it.qty; }, 0); }

  function find(kind, fid, bid, fmt) {
    for (var i = 0; i < cart.length; i++) {
      var it = cart[i];
      if (it.kind !== kind || it.baseId !== bid) continue;
      if (kind === 'assorti') return it;
      if (it.flavorId === fid && it.formatId === fmt) return it;
    }
    return null;
  }
  function addFlavor(fid, bid, fmt, qty) { var it = find('flavor', fid, bid, fmt); if (it) it.qty += qty; else cart.push({ kind: 'flavor', flavorId: fid, baseId: bid, formatId: fmt, qty: qty }); after(true); }
  function addAssorti(bid, qty) { var it = find('assorti', null, bid, null); if (it) it.qty += qty; else cart.push({ kind: 'assorti', baseId: bid, qty: qty }); after(true); }
  function changeQty(i, d) { cart[i].qty += d; if (cart[i].qty <= 0) cart.splice(i, 1); after(false); }
  function removeItem(i) { cart.splice(i, 1); after(false); }
  function after(flash) { saveCart(); renderCart(); renderBatch(); updateCount(); if (flash) pulse(); }

  // ---------- batch ----------
  function renderBatch() {
    var projected = Math.min(D.batchTargetG, batchG + totalWeight());
    var pct = Math.round(projected / D.batchTargetG * 100);
    $('#batchFill').style.width = pct + '%';
    $('#batchKg').textContent = (projected / 1000).toFixed(1) + ' / ' + (D.batchTargetG / 1000) + ' кг';
    var remKg = Math.max(0, (D.batchTargetG - projected) / 1000);
    $('#batchNote').innerHTML = remKg <= 0
      ? 'Партия набрана — запускаем производство! 🚀'
      : 'Осталось <b>' + remKg.toFixed(1).replace('.', ',') + ' кг</b> до запуска партии 🚀';
  }

  // ---------- catalog ----------
  function compBody(toppingHtml) {
    return '<div class="comp-body">' + toppingHtml +
      '<br><b>Молочная основа:</b> ' + baseById('milk').comp +
      '<br><b>Миндальная основа:</b> ' + baseById('almond').comp + '</div>';
  }
  function baseRadios(name) {
    return D.bases.map(function (b, i) { return '<label class="chip"><input type="radio" name="' + name + '" value="' + b.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + b.pick + '</span></label>'; }).join('');
  }
  function qtyBox() {
    return '<div class="qty" data-qty><button type="button" class="q-btn" data-q="-1" aria-label="Меньше">−</button><span class="q-val">1</span><button type="button" class="q-btn" data-q="1" aria-label="Больше">+</button></div>';
  }
  function renderCatalog() {
    var cards = D.flavors.map(function (f) {
      var fmts = D.formats.map(function (fm, i) { return '<label class="chip"><input type="radio" name="fmt-' + f.id + '" value="' + fm.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + fm.name + ' · ' + rub(fm.price) + '</span></label>'; }).join('');
      return '<article class="prod" data-flavor="' + f.id + '">' +
        '<img class="prod-img" src="' + f.img + '" alt="' + f.name + ' — Lari" loading="lazy" />' +
        '<div class="prod-body"><h3>' + f.name + '</h3><p class="prod-desc">' + f.desc + '</p>' +
          '<div class="base-pick" role="group" aria-label="Основа">' + baseRadios('base-' + f.id) + '</div>' +
          '<div class="base-pick" role="group" aria-label="Формат">' + fmts + '</div>' +
          '<details class="comp"><summary>Состав</summary>' + compBody('<b>Ягодная часть:</b> ' + f.topping) + '</details>' +
          '<div class="prod-foot">' + qtyBox() + '<span class="price" data-price>' + rub(D.formats[0].price) + '</span></div>' +
          '<button type="button" class="btn btn-primary btn-block add-flavor">В корзину</button>' +
        '</div></article>';
    }).join('');
    var allTop = D.flavors.map(function (f) { return f.name + ' — ' + f.topping; }).join('<br>');
    cards += '<article class="prod" data-assorti><img class="prod-img" src="' + D.assorti.img + '" alt="Ассорти-набор Lari" loading="lazy" />' +
      '<div class="prod-body"><h3>' + D.assorti.name + '</h3><p class="prod-desc">' + D.assorti.desc + '</p>' +
        '<div class="base-pick" role="group" aria-label="Основа">' + baseRadios('base-assorti') + '</div>' +
        '<details class="comp"><summary>Состав</summary>' + compBody('<b>Вкусы:</b> ' + allTop) + '</details>' +
        '<div class="prod-foot">' + qtyBox() + '<span class="price">' + rub(D.assorti.price) + '</span></div>' +
        '<button type="button" class="btn btn-primary btn-block add-assorti">В корзину</button>' +
      '</div></article>';
    $('#grid').innerHTML = cards;
  }

  document.addEventListener('change', function (e) {
    var r = e.target;
    if (r.name && r.name.indexOf('fmt-') === 0) {
      var card = r.closest('.prod'); var fm = fmtById(r.value);
      var p = card.querySelector('[data-price]'); if (p && fm) p.textContent = rub(fm.price);
    }
  });
  document.addEventListener('click', function (e) {
    var q = e.target.closest('.q-btn');
    if (q) { var box = q.closest('[data-qty]'); if (!box) return; var val = box.querySelector('.q-val'); var n = parseInt(val.textContent, 10) + parseInt(q.getAttribute('data-q'), 10); val.textContent = Math.min(20, Math.max(1, n)); return; }
    var af = e.target.closest('.add-flavor');
    if (af) { var c = af.closest('.prod'); var fid = c.getAttribute('data-flavor'); var bid = c.querySelector('input[name="base-' + fid + '"]:checked').value; var fmt = c.querySelector('input[name="fmt-' + fid + '"]:checked').value; var qty = parseInt(c.querySelector('.q-val').textContent, 10); addFlavor(fid, bid, fmt, qty); openCart(); return; }
    var aa = e.target.closest('.add-assorti');
    if (aa) { var c2 = aa.closest('.prod'); var bid2 = c2.querySelector('input[name="base-assorti"]:checked').value; var qty2 = parseInt(c2.querySelector('.q-val').textContent, 10); addAssorti(bid2, qty2); openCart(); }
  });

  function itemTitle(it) { return it.kind === 'assorti' ? D.assorti.name : flavorById(it.flavorId).name; }
  function itemSub(it) { return it.kind === 'assorti' ? (baseById(it.baseId).short + ' · 4×300 г') : (baseById(it.baseId).short + ' · ' + fmtById(it.formatId).name); }

  function renderCart() {
    var wrap = $('#cartItems');
    if (!cart.length) wrap.innerHTML = '<p class="cart-empty">Корзина пуста.<br>Минимальный заказ — 900 г.</p>';
    else wrap.innerHTML = cart.map(function (it, i) {
      return '<div class="cart-item"><div class="ci-info"><strong>' + itemTitle(it) + '</strong><span>' + itemSub(it) + '</span></div>' +
        '<div class="ci-controls"><div class="qty"><button type="button" class="q-btn" data-ci="' + i + '" data-d="-1" aria-label="Меньше">−</button><span class="q-val">' + it.qty + '</span><button type="button" class="q-btn" data-ci="' + i + '" data-d="1" aria-label="Больше">+</button></div>' +
        '<div class="ci-price">' + rub(itemPrice(it)) + '</div><button type="button" class="ci-remove" data-rm="' + i + '">Удалить</button></div></div>';
    }).join('');
    $('#cartTotal').textContent = rub(totalPrice());
    var w = totalWeight(), note = $('#minNote'), btn = $('#checkoutBtn');
    if (w >= D.minOrderG) { note.className = 'min-note ok'; note.textContent = 'В заказе ' + kg(w) + '. Можно оформлять.'; btn.disabled = false; }
    else { note.className = 'min-note warn'; note.textContent = 'Минимальный заказ — 900 г. Добавьте ещё ' + (D.minOrderG - w) + ' г.'; btn.disabled = true; }
  }
  $('#cartItems').addEventListener('click', function (e) {
    var q = e.target.closest('.q-btn'); if (q && q.hasAttribute('data-ci')) { changeQty(+q.getAttribute('data-ci'), +q.getAttribute('data-d')); return; }
    var rm = e.target.closest('.ci-remove'); if (rm) removeItem(+rm.getAttribute('data-rm'));
  });
  function updateCount() { var c = totalUnits(); var el = $('#cartCount'); el.textContent = c; el.hidden = c === 0; }

  function overlay(on) { $('#overlay').hidden = !on; }
  function openCart() { $('#cartDrawer').classList.add('open'); overlay(true); }
  function closeCart() { $('#cartDrawer').classList.remove('open'); maybeHide(); }
  function openModal(id) { $(id).hidden = false; overlay(true); }
  function closeModal(id) { $(id).hidden = true; maybeHide(); }
  function maybeHide() { if (!$('#cartDrawer').classList.contains('open') && $('#checkoutModal').hidden && $('#confirmModal').hidden) overlay(false); }
  function closeAll() { closeCart(); $('#checkoutModal').hidden = true; $('#confirmModal').hidden = true; overlay(false); }
  function pulse() { var b = $('#cartBtn'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }

  function summaryHTML() {
    return cart.map(function (it) { return '<div class="sum-row"><span>' + itemTitle(it) + ' · ' + itemSub(it) + ' × ' + it.qty + '</span><span>' + rub(itemPrice(it)) + '</span></div>'; }).join('') +
      '<div class="sum-row sum-total"><span>Итого (' + kg(totalWeight()) + ')</span><span>' + rub(totalPrice()) + '</span></div>';
  }
  function openCheckout() { if (totalWeight() < D.minOrderG) return; $('#orderSummary').innerHTML = summaryHTML(); $('#paySum').textContent = rub(totalPrice()); closeCart(); openModal('#checkoutModal'); }
  function orderNo() { return 'LARI-' + String(Date.now()).slice(-6); }
  function submitOrder(e) {
    e.preventDefault(); var form = e.target; if (!form.checkValidity()) { form.reportValidity(); return; }
    var order = { no: orderNo(), date: new Date().toISOString(), customer: { name: form.elements.name.value.trim(), contact: form.elements.contact.value.trim(), city: form.elements.city.value.trim(), address: form.elements.address.value.trim(), comment: form.elements.comment.value.trim() }, items: cart.slice(), weightG: totalWeight(), total: totalPrice() };
    var orders = []; try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e2) {} orders.push(order); try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch (e3) {}
    batchG = batchG + totalWeight(); if (batchG >= D.batchTargetG) batchG = batchG % D.batchTargetG; saveBatch();
    $('#orderNo').textContent = order.no; $('#confirmSummary').innerHTML = summaryHTML();
    cart = []; saveCart(); renderCart(); renderBatch(); updateCount(); form.reset(); closeModal('#checkoutModal'); openModal('#confirmModal');
  }

  function init() {
    renderCatalog(); renderCart(); renderBatch(); updateCount();
    $('#cartBtn').addEventListener('click', openCart);
    $('#cartClose').addEventListener('click', closeCart);
    $('#overlay').addEventListener('click', closeAll);
    $('#checkoutBtn').addEventListener('click', openCheckout);
    $('#orderForm').addEventListener('submit', submitOrder);
    $all('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeModal('#checkoutModal'); closeModal('#confirmModal'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
