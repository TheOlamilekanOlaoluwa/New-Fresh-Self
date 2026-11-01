"use strict";
/* FreshShelf app. Sections: 1 Data · 2 Helpers · 3 Cart · 4 Page state · 5 Header · 6 Pickup page · 7 Scan & Go page · 8 Checkout · 9 Login · 10 Events & start-up · 11 QR code maker */

/* ==========================================================
   1. DATA: the products we sell
   ========================================================== */
/* ============================== DATA ============================== */
const CATEGORIES = ["Dairy", "Grains", "Produce", "Beverages", "Household"];
const PRODUCTS = [
  {
    id: "p1",
    name: "Fresh Milk 1L",
    barcode: "600100000001",
    category: "Dairy",
    price: 2.2,
    unit: "each",
    step: 1,
    stock: 24,
    aisle: "Aisle 3 - Dairy",
    emoji: "🥛",
  },
  {
    id: "p2",
    name: "Eggs (Crate of 30)",
    barcode: "600100000002",
    category: "Dairy",
    price: 6.5,
    unit: "each",
    step: 1,
    stock: 3,
    aisle: "Aisle 3 - Dairy",
    emoji: "🥚",
  },
  {
    id: "p3",
    name: "Long Grain Rice",
    barcode: "600100000003",
    category: "Grains",
    price: 1.8,
    unit: "kg",
    step: 0.5,
    stock: 40,
    aisle: "Aisle 1 - Grains",
    emoji: "🍚",
  },
  {
    id: "p4",
    name: "Beans (loose)",
    barcode: "600100000004",
    category: "Grains",
    price: 2.4,
    unit: "kg",
    step: 0.5,
    stock: 4,
    aisle: "Aisle 1 - Grains",
    emoji: "🫘",
  },
  {
    id: "p5",
    name: "Tomatoes",
    barcode: "600100000005",
    category: "Produce",
    price: 3.1,
    unit: "kg",
    step: 0.5,
    stock: 12,
    aisle: "Aisle 5 - Produce",
    emoji: "🍅",
  },
  {
    id: "p6",
    name: "Plantain Bunch",
    barcode: "600100000006",
    category: "Produce",
    price: 1.5,
    unit: "each",
    step: 1,
    stock: 0,
    aisle: "Aisle 5 - Produce",
    emoji: "🍌",
  },
  {
    id: "p7",
    name: "Bottled Water 75cl",
    barcode: "600100000007",
    category: "Beverages",
    price: 0.5,
    unit: "each",
    step: 1,
    stock: 120,
    aisle: "Aisle 2 - Drinks",
    emoji: "💧",
  },
  {
    id: "p8",
    name: "Orange Juice 1L",
    barcode: "600100000008",
    category: "Beverages",
    price: 2.9,
    unit: "each",
    step: 1,
    stock: 5,
    aisle: "Aisle 2 - Drinks",
    emoji: "🧃",
  },
  {
    id: "p9",
    name: "Dish Soap 500ml",
    barcode: "600100000009",
    category: "Household",
    price: 1.9,
    unit: "each",
    step: 1,
    stock: 18,
    aisle: "Aisle 7 - Household",
    emoji: "🧼",
  },
  {
    id: "p10",
    name: "Toilet Roll (4 pack)",
    barcode: "600100000010",
    category: "Household",
    price: 3.4,
    unit: "each",
    step: 1,
    stock: 2,
    aisle: "Aisle 7 - Household",
    emoji: "🧻",
  },
];
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const LOW = 5;
const TIMES = ["ASAP (15 min)", "30 min", "1 hour", "2 hours"];

/* ==========================================================
   2. HELPERS: small tools used everywhere
   ========================================================== */
/* ============================== HELPERS ============================== */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2);
const round3 = (n) => Math.round(n * 1000) / 1000;
const qtyLabel = (q, u) => (u === "kg" ? q + " kg" : "×" + q);
function load(k, d) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch (e) {
    return d;
  }
}
function save(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
}

/* ==========================================================
   3. CART: add, remove and remember items
   ========================================================== */
/* ============================== CART STORE (persisted) ============================== */
const store = (() => {
  let cart = {};
  const raw = load("fs-cart-v1", {});
  for (const id in raw) {
    const p = byId[id];
    const q = Number(raw[id]);
    if (p && q > 0 && p.stock > 0) cart[id] = Math.min(round3(q), p.stock);
  }
  const subs = [];
  const emit = () => {
    save("fs-cart-v1", cart);
    subs.forEach((f) => f());
  };
  return {
    subscribe: (f) => subs.push(f),
    qty: (id) => cart[id] || 0,
    lines: () => Object.keys(cart).map((id) => ({ p: byId[id], qty: cart[id] })),
    subtotal: () => round3(Object.keys(cart).reduce((s, id) => s + byId[id].price * cart[id], 0)),
    add(id, n) {
      const p = byId[id];
      if (!p || p.stock <= 0) return;
      cart[id] = Math.min(round3((cart[id] || 0) + (n ?? p.step)), p.stock);
      emit();
    },
    set(id, q) {
      const p = byId[id];
      q = Math.min(round3(q), p.stock);
      if (q <= 0) delete cart[id];
      else cart[id] = q;
      emit();
    },
    remove(id) {
      delete cart[id];
      emit();
    },
    clear() {
      cart = {};
      emit();
    },
  };
})();

/* ==========================================================
   4. PAGE STATE: current mode and search filters
   ========================================================== */
/* ============================== MODE ============================== */
let mode = load("fs-mode-v1", "pickup");
if (mode !== "scan" && mode !== "pickup") mode = "pickup";

/* ============================== FILTERS (state + URL query params) ============================== */
const DEFAULT_FILTERS = { q: "", cat: "", max: null, stock: false };
function readURL() {
  const p = new URLSearchParams(location.search),
    mx = p.get("max"),
    cat = p.get("cat") || "";
  return {
    q: p.get("q") || "",
    cat: CATEGORIES.includes(cat) ? cat : "",
    max: mx !== null && mx !== "" && !isNaN(Number(mx)) ? Number(mx) : null,
    stock: p.get("stock") === "1",
  };
}
function writeURL() {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.cat) p.set("cat", filters.cat);
  if (filters.max !== null) p.set("max", filters.max);
  if (filters.stock) p.set("stock", "1");
  const qs = p.toString();
  try {
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  } catch (e) {}
}
let filters = readURL();

/* ==========================================================
   5. HEADER: cart total and mode buttons
   ========================================================== */
/* ============================== HEADER ============================== */
const HERO_COPY = {
  pickup:
    "Browse the shelves, reserve your basket and collect it at the counter when it suits you.",
  scan: "Walking the aisles? Scan barcodes as you shop, pay on your phone and skip the queue.",
};
function renderHeader() {
  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.classList.toggle("on", b.dataset.mode === mode);
    b.setAttribute("aria-selected", b.dataset.mode === mode);
  });
  const n = store.lines().length;
  $("#cartsum").textContent = money(store.subtotal());
  const c = $("#cartcount");
  c.textContent = n;
  c.classList.toggle("hidden", n === 0);
  $("#cartbtn").setAttribute("aria-label", `Open cart, ${n} item${n === 1 ? "" : "s"}`);
  const h = $("#heroSub");
  if (h) h.textContent = HERO_COPY[mode];
}

/* ==========================================================
   6. PICKUP PAGE: search, filters, product cards
   ========================================================== */
/* ============================== PICKUP VIEW ============================== */
let debounceT = null;
const ICON_SEARCH =
  '<svg class="search-ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
function renderPickup() {
  $("#main").innerHTML = `
  <section class="toolbar" aria-label="Find products">
    <div class="searchbox">${ICON_SEARCH}<input class="search" id="q" type="search" placeholder="Search milk, rice, eggs…" aria-label="Search products" value="${esc(filters.q)}"></div>
    <div class="catbar" id="catbar" role="group" aria-label="Categories">
      ${["", ...CATEGORIES].map((c) => `<button type="button" class="cat ${filters.cat === c ? "on" : ""}" data-cat="${c}" aria-pressed="${filters.cat === c}">${c || "All"}</button>`).join("")}
    </div>
    <div class="filters">
      <select id="max" aria-label="Max price">
        <option value="">Any price</option>${[2, 5, 10].map((v) => `<option value="${v}" ${filters.max === v ? "selected" : ""}>Under $${v}</option>`).join("")}
      </select>
      <label class="switch"><input type="checkbox" id="stock" ${filters.stock ? "checked" : ""}><span class="track"></span>In stock only</label>
      <button class="link" id="reset" type="button">Reset filters</button>
    </div>
  </section>
  <div class="count" id="count" aria-live="polite"></div>
  <div id="grid"></div>`;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(debounceT);
    const v = e.target.value;
    debounceT = setTimeout(() => {
      filters.q = v;
      writeURL();
      renderGrid();
    }, 300);
  });
  $("#catbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    filters.cat = b.dataset.cat;
    writeURL();
    document.querySelectorAll("#catbar .cat").forEach((x) => {
      const on = x === b;
      x.classList.toggle("on", on);
      x.setAttribute("aria-pressed", on);
    });
    renderGrid();
  });
  $("#max").addEventListener("change", (e) => {
    filters.max = e.target.value === "" ? null : Number(e.target.value);
    writeURL();
    renderGrid();
  });
  $("#stock").addEventListener("change", (e) => {
    filters.stock = e.target.checked;
    writeURL();
    renderGrid();
  });
  $("#reset").addEventListener("click", () => {
    clearTimeout(debounceT);
    filters = { ...DEFAULT_FILTERS };
    writeURL();
    renderPickup();
  });
  renderGrid();
}
function visibleProducts() {
  const q = filters.q.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q))
      return false;
    if (filters.cat && p.category !== filters.cat) return false;
    if (filters.max !== null && p.price > filters.max) return false;
    if (filters.stock && p.stock <= 0) return false;
    return true;
  });
}
function cardHTML(p) {
  const out = p.stock <= 0,
    low = !out && p.stock <= LOW,
    inCart = store.qty(p.id),
    maxed = inCart >= p.stock;
  const label = out
    ? "Unavailable"
    : maxed
      ? "Max in cart"
      : p.unit === "kg"
        ? `Add ${p.step} kg`
        : "Add to cart";
  const tag = out
    ? '<span class="tag tag-out">Out of stock</span>'
    : low
      ? `<span class="tag tag-low">Only ${p.stock}${p.unit === "kg" ? " kg" : ""} left</span>`
      : "";
  return `<article class="card ${out ? "is-out" : ""}" data-cat="${esc(p.category)}">
    <div class="tile"><span class="emoji" aria-hidden="true">${p.emoji}</span>${tag}</div>
    <div class="card-body">
      <span class="aisle">${esc(p.aisle)}</span>
      <h3>${esc(p.name)}</h3>
      <div class="price"><strong>${money(p.price)}</strong><span>/ ${p.unit === "kg" ? "kg" : "each"}</span></div>
      ${inCart > 0 ? `<div class="incart">✓ In cart: ${qtyLabel(inCart, p.unit)}</div>` : ""}
    </div>
    <button class="add" data-add="${p.id}" ${out || maxed ? "disabled" : ""}>${label}</button>
  </article>`;
}
function renderGrid() {
  const g = $("#grid");
  if (!g) return;
  const list = visibleProducts();
  $("#count").textContent = `Showing ${list.length} product${list.length === 1 ? "" : "s"}`;
  g.innerHTML = list.length
    ? `<div class="grid">${list.map(cardHTML).join("")}</div>`
    : '<div class="empty"><div class="empty-ic">🔍</div><strong>Nothing matches those filters</strong><p>Try a different search or reset the filters.</p></div>';
}

/* ==========================================================
   7. SCAN & GO PAGE: camera and barcode simulator
   ========================================================== */
/* ============================== SCAN & GO VIEW ============================== */
let stream = null,
  scanTimer = null,
  lastScan = { code: "", at: 0 };
function setScanMsg(t) {
  const el = $("#scanmsg");
  if (el) el.textContent = t;
}
function handleCode(code) {
  const now = Date.now();
  if (code === lastScan.code && now - lastScan.at < 1500) return;
  lastScan = { code, at: now };
  const p = PRODUCTS.find((x) => x.barcode === code);
  if (!p) return setScanMsg(`❌ Unknown barcode "${code}"`);
  if (p.stock <= 0) return setScanMsg(`⚠️ ${p.name} is out of stock`);
  if (store.qty(p.id) >= p.stock) return setScanMsg(`⚠️ No more ${p.name} on the shelf`);
  store.add(p.id);
  setScanMsg(`✅ Added ${p.name} (${qtyLabel(store.qty(p.id), p.unit)} in cart)`);
}
function stopCam() {
  clearInterval(scanTimer);
  scanTimer = null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  const v = $("#video");
  if (v) v.srcObject = null;
  const ph = $("#camph"),
    ln = $("#camline"),
    b = $("#camtoggle");
  if (ph) ph.classList.remove("hidden");
  if (ln) ln.classList.add("hidden");
  if (b) b.textContent = "Start camera scanner";
}
async function startCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const v = $("#video");
    v.srcObject = stream;
    await v.play();
    $("#camph").classList.add("hidden");
    $("#camline").classList.remove("hidden");
    $("#camtoggle").textContent = "Stop camera";
    if ("BarcodeDetector" in window) {
      const det = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      setScanMsg("Scanning… hold a barcode steady in view.");
      scanTimer = setInterval(async () => {
        try {
          const r = await det.detect(v);
          if (r && r[0]) handleCode(r[0].rawValue);
        } catch (e) {}
      }, 600);
    } else
      setScanMsg("Camera is on, but this browser cannot read barcodes. Use the simulator below.");
  } catch (e) {
    stopCam();
    setScanMsg("Camera unavailable (permission denied or no camera). Use the simulator below.");
  }
}
function renderScan() {
  $("#main").innerHTML = `
  <div class="scan-grid">
    <section>
      <div class="cam"><video id="video" muted playsinline></video><div class="ph" id="camph"><span>📷</span>Camera is off</div><div class="frame" aria-hidden="true"></div><div class="line hidden" id="camline"></div></div>
      <button class="full" id="camtoggle">Start camera scanner</button>
      <div class="msg" id="scanmsg" aria-live="polite">Start the camera, or use the scan simulator.</div>
    </section>
    <section class="panel"><h3>Scan simulator</h3><p class="sm">No camera? Type a barcode or tap a product to simulate a scan.</p>
      <form class="row" id="manual"><input class="in" id="manualcode" inputmode="numeric" placeholder="e.g. 600100000001" aria-label="Barcode"><button class="dark">Scan</button></form>
      <div class="chips">${PRODUCTS.map((p) => `<button type="button" class="chip" data-scan="${p.barcode}">${p.emoji} ${esc(p.name)}</button>`).join("")}</div>
    </section>
  </div>`;
  $("#camtoggle").addEventListener("click", () => (stream ? stopCam() : startCam()));
  $("#manual").addEventListener("submit", (e) => {
    e.preventDefault();
    const i = $("#manualcode");
    const c = i.value.trim();
    if (c) handleCode(c);
    i.value = "";
  });
}

/* ==========================================================
   8. CHECKOUT: cart, details, payment, receipt
   ========================================================== */
/* ============================== CHECKOUT WIZARD ============================== */
const ck = {
  open: false,
  step: "cart",
  form: {
    name: "",
    phone: "",
    pickup: TIMES[0],
    notes: "",
    method: "card",
    card: "",
    exp: "",
    cvc: "",
  },
  errors: {},
  order: load("fs-order-v1", null),
};
const STEPS = ["cart", "details", "payment"];
const e1 = (k) => (ck.errors[k] ? `<p class="err">${ck.errors[k]}</p>` : "");
function validDetails() {
  const f = ck.form,
    er = {};
  if (f.name.trim().length < 2) er.name = "Enter your full name";
  if (!/^[+\d][\d\s-]{6,17}$/.test(f.phone.trim())) er.phone = "Enter a valid phone number";
  if (f.notes.length > 200) er.notes = "Max 200 characters";
  return er;
}
function validPayment() {
  const f = ck.form,
    er = {};
  if (f.method !== "card") return er;
  if (!/^\d{16}$/.test(f.card.replace(/\s/g, ""))) er.card = "Enter a 16-digit card number";
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(f.exp);
  if (!m) er.exp = "Use MM/YY";
  else {
    const now = new Date(),
      yy = now.getFullYear() % 100,
      mm = now.getMonth() + 1,
      y = +m[2],
      mo = +m[1];
    if (y < yy || (y === yy && mo < mm)) er.exp = "Card has expired";
  }
  if (!/^\d{3,4}$/.test(f.cvc)) er.cvc = "3 or 4 digits";
  return er;
}
function modalBody() {
  const f = ck.form,
    lines = store.lines();
  if (ck.step === "cart") {
    return lines.length
      ? `<div>${lines
          .map(
            ({
              p,
              qty,
            }) => `<div class="li"><div class="n"><b>${esc(p.name)}</b><span>${money(p.price)} / ${p.unit === "kg" ? "kg" : "each"}</span></div>
      <div class="q"><button data-act="dec" data-id="${p.id}" aria-label="Decrease ${esc(p.name)}">−</button><span>${qtyLabel(qty, p.unit)}</span><button data-act="inc" data-id="${p.id}" ${qty >= p.stock ? "disabled" : ""} aria-label="Increase ${esc(p.name)}">+</button><button class="rm" data-act="rm" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">✕</button></div></div>`,
          )
          .join("")}</div>
      <div class="tot"><span>Subtotal</span><span>${money(store.subtotal())}</span></div>
      <button class="full" data-act="toDetails">Continue</button>`
      : `<p class="empty" style="border:0">Your cart is empty.</p>${ck.order ? '<button class="ghost" style="width:100%" data-act="viewReceipt">View last receipt</button>' : ""}`;
  }
  if (ck.step === "details") {
    return `<form id="f-details" novalidate>
      <div class="fld"><input class="in" name="name" placeholder="Full name" autocomplete="name" value="${esc(f.name)}">${e1("name")}</div>
      <div class="fld"><input class="in" name="phone" placeholder="Phone number" inputmode="tel" autocomplete="tel" value="${esc(f.phone)}">${e1("phone")}</div>
      ${mode === "pickup" ? `<div class="fld"><select class="in" name="pickup" aria-label="Pickup time">${TIMES.map((t) => `<option ${f.pickup === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>` : ""}
      <div class="fld"><textarea class="in" name="notes" rows="2" maxlength="200" placeholder="Notes for the clerk (optional)">${esc(f.notes)}</textarea>${e1("notes")}</div>
      <div class="row"><button type="button" class="ghost" data-act="toCart">Back</button><button class="pri">Continue</button></div></form>`;
  }
  if (ck.step === "payment") {
    return `<form id="f-pay" novalidate>
      <div class="pay"><button type="button" data-act="method" data-m="card" class="${f.method === "card" ? "on" : ""}">💳 Mock card</button><button type="button" data-act="method" data-m="counter" class="${f.method === "counter" ? "on" : ""}">🏪 Pay at counter</button></div>
      ${
        f.method === "card"
          ? `<div class="fld"><input class="in" name="card" placeholder="4242 4242 4242 4242" inputmode="numeric" autocomplete="off" value="${esc(f.card)}">${e1("card")}</div>
      <div class="row"><div class="fld" style="flex:1"><input class="in" name="exp" placeholder="MM/YY" inputmode="numeric" autocomplete="off" value="${esc(f.exp)}">${e1("exp")}</div>
      <div class="fld" style="flex:1"><input class="in" name="cvc" placeholder="CVC" inputmode="numeric" autocomplete="off" value="${esc(f.cvc)}">${e1("cvc")}</div></div>
      <p class="note">Demo only – no real payment is processed and card details are never stored.</p>`
          : ""
      }
      <div class="tot"><span>Total</span><span>${money(store.subtotal())}</span></div>
      <div class="row"><button type="button" class="ghost" data-act="toDetails">Back</button><button class="pri">Place order</button></div></form>`;
  }
  const o = ck.order;
  return `<div class="ok"><div style="font-size:48px">✅</div><p class="sm">Show this QR code to the store clerk.</p>
    <div class="qr">${QR.svg(o.payload)}</div><div class="oid">${esc(o.id)}</div>
    <div class="sm">${esc(o.name)} · ${esc(o.mode)} · ${money(o.total)}</div>
    <ul class="rc">${o.items.map((i) => `<li><span>${esc(i.name)}</span><span>${esc(i.label)}</span></li>`).join("")}</ul>
    <button class="full" data-act="done">Done</button></div>`;
}
function renderModal() {
  const root = $("#modalroot");
  if (!ck.open) {
    root.innerHTML = "";
    document.body.classList.remove("lock");
    return;
  }
  const titles = {
    cart: "Your cart",
    details: "Your details",
    payment: "Payment",
    success: "Order confirmed",
  };
  const idx = STEPS.indexOf(ck.step);
  root.innerHTML = `<div class="ov" data-act="overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${titles[ck.step]}">
    <div class="mh"><h2>${titles[ck.step]}</h2><button class="x" data-act="close" aria-label="Close">×</button></div>
    ${ck.step !== "success" ? `<div class="steps">${STEPS.map((s, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("")}</div>` : ""}
    ${modalBody()}</div></div>`;
  document.body.classList.add("lock");
}
function openCart() {
  ck.open = true;
  ck.step = "cart";
  ck.errors = {};
  renderModal();
}
function closeCart() {
  ck.open = false;
  ck.step = "cart";
  ck.errors = {};
  renderModal();
}
function placeOrder() {
  const f = ck.form,
    lines = store.lines();
  if (!lines.length) {
    ck.step = "cart";
    return renderModal();
  }
  const id =
    "FS-" +
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 6)
      .toUpperCase();
  const total = store.subtotal();
  const modeLabel = mode === "pickup" ? `Pickup – ${f.pickup}` : "Scan & Go";
  const items = lines.map(({ p, qty }) => ({ name: p.name, label: qtyLabel(qty, p.unit) }));
  let payload = "",
    list = items.map((i) => `${i.name} ${i.label}`);
  const build = (n) =>
    `FRESHSHELF|${id}|${f.name.trim()}|$${total.toFixed(2)}|${modeLabel}|${list.slice(0, n).join("; ")}${n < list.length ? "; +" + (list.length - n) + " more" : ""}`;
  for (let n = list.length; n >= 0; n--) {
    payload = build(n);
    if (new TextEncoder().encode(payload).length <= 250) break;
  }
  if (new TextEncoder().encode(payload).length > 250)
    payload = `FRESHSHELF|${id}|${total.toFixed(2)}`;
  ck.order = { id, name: f.name.trim(), total, mode: modeLabel, items, payload };
  save("fs-order-v1", ck.order);
  store.clear();
  ck.form.card = ck.form.exp = ck.form.cvc = "";
  ck.step = "success";
  renderModal();
}

/* ==========================================================
   9. LOGIN: the first page. Saves the user in this browser.
   ========================================================== */
const USER_KEY = "fs-user-v1";
let user = load(USER_KEY, null); // {name, email, phone} or null if signed out

// Check the three login fields and return an object of error messages
function validLogin(f) {
  const errors = {};
  if (f.name.trim().length < 2 || !/\p{L}/u.test(f.name)) errors.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()))
    errors.email = "Enter a valid email address";
  if (!/^[+\d][\d\s-]{6,17}$/.test(f.phone.trim())) errors.phone = "Enter a valid phone number";
  return errors;
}

// Show (or clear) the red error text under each login field
function showLoginErrors(errors) {
  ["name", "email", "phone"].forEach((key) => {
    $("#err-" + key).textContent = errors[key] || "";
    $("#lf-" + key).classList.toggle("bad", Boolean(errors[key]));
  });
}

function showLogin() {
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
}

// Hide the login page, show the store and greet the user
function enterApp() {
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  const firstName = user.name.trim().split(/\s+/)[0];
  $("#welcome").textContent = "Welcome, " + firstName;
  // Pre-fill the checkout form so they don't type these twice
  ck.form.name = user.name;
  ck.form.phone = user.phone;
  renderMain();
  window.scrollTo(0, 0);
}

function signIn(event) {
  event.preventDefault();
  const details = {
    name: $("#lf-name").value,
    email: $("#lf-email").value,
    phone: $("#lf-phone").value,
  };
  const errors = validLogin(details);
  showLoginErrors(errors);
  if (Object.keys(errors).length) {
    $("#login-form").querySelector(".bad").focus(); // jump to first problem
    return;
  }
  user = { name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim() };
  save(USER_KEY, user);
  enterApp();
}

function signOut() {
  stopCam();
  closeCart();
  user = null;
  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {}
  ck.form.name = "";
  ck.form.phone = "";
  $("#login-form").reset();
  showLoginErrors({});
  showLogin();
  window.scrollTo(0, 0);
}

$("#login-form").addEventListener("submit", signIn);
$("#signout").addEventListener("click", signOut);
// Remove a field's error as soon as the person starts fixing it
$("#login-form").addEventListener("input", (e) => {
  $("#err-" + e.target.name).textContent = "";
  e.target.classList.remove("bad");
});

// First load: go straight to the store if already signed in, otherwise show login
function startApp() {
  if (user && user.name && user.phone) enterApp();
  else showLogin();
}

/* ==========================================================
   10. EVENTS & START-UP: clicks, typing, and first load
   ========================================================== */
/* ============================== VIEW SWITCH ============================== */
function renderMain() {
  stopCam();
  mode === "pickup" ? renderPickup() : renderScan();
  renderHeader();
}
function setMode(m) {
  if (m === mode) return;
  mode = m;
  save("fs-mode-v1", m);
  renderMain();
}

/* ============================== EVENTS ============================== */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-add],[data-mode],[data-scan],[data-act],#cartbtn");
  if (!t) return;
  if (t.matches("[data-add]")) return store.add(t.dataset.add);
  if (t.matches("[data-mode]")) return setMode(t.dataset.mode);
  if (t.matches("[data-scan]")) return handleCode(t.dataset.scan);
  if (t.id === "cartbtn") return openCart();
  const a = t.dataset.act;
  if (a === "overlay") {
    if (e.target === t) closeCart();
    return;
  }
  if (a === "close" || a === "done") return closeCart();
  if (a === "inc") {
    const p = byId[t.dataset.id];
    store.set(p.id, store.qty(p.id) + p.step);
    return;
  }
  if (a === "dec") {
    const p = byId[t.dataset.id];
    store.set(p.id, store.qty(p.id) - p.step);
    return;
  }
  if (a === "rm") return store.remove(t.dataset.id);
  if (a === "toDetails") {
    ck.errors = {};
    ck.step = "details";
    return renderModal();
  }
  if (a === "toCart") {
    ck.errors = {};
    ck.step = "cart";
    return renderModal();
  }
  if (a === "method") {
    ck.form.method = t.dataset.m;
    ck.errors = {};
    return renderModal();
  }
  if (a === "viewReceipt") {
    ck.step = "success";
    return renderModal();
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.closest("#modalroot") || !el.name) return;
  if (el.name === "card") {
    const d = el.value.replace(/\D/g, "").slice(0, 16);
    el.value = d.replace(/(.{4})/g, "$1 ").trim();
    ck.form.card = el.value;
    return;
  }
  if (el.name === "exp") {
    let d = el.value.replace(/\D/g, "").slice(0, 4);
    if (d.length > 2) d = d.slice(0, 2) + "/" + d.slice(2);
    el.value = d;
    ck.form.exp = d;
    return;
  }
  if (el.name === "cvc") {
    el.value = el.value.replace(/\D/g, "").slice(0, 4);
    ck.form.cvc = el.value;
    return;
  }
  ck.form[el.name] = el.value;
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "f-details") {
    e.preventDefault();
    ck.errors = validDetails();
    if (Object.keys(ck.errors).length) return renderModal();
    ck.step = "payment";
    renderModal();
  }
  if (e.target.id === "f-pay") {
    e.preventDefault();
    ck.errors = validPayment();
    if (Object.keys(ck.errors).length) return renderModal();
    placeOrder();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ck.open) closeCart();
});
window.addEventListener("pagehide", stopCam);

/* Cart changes: refresh header, product cards and (if open) the cart step */
store.subscribe(() => {
  renderHeader();
  renderGrid();
  if (ck.open && ck.step === "cart") renderModal();
});

startApp();

/* ==========================================================
   11. QR CODE MAKER: turns the order into a QR image (no need to edit this part)
   ========================================================== */
/* ============================== QR CODE (dependency-free, byte mode, ECC L, v1–10) ============================== */
const QR = (() => {
  const ECC = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    BLK = [1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
  const bit = (x, i) => ((x >>> i) & 1) !== 0;
  function raw(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const a = Math.floor(v / 7) + 2;
      r -= (25 * a - 10) * a - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  function mul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function divisor(d) {
    const r = new Array(d).fill(0);
    r[d - 1] = 1;
    let root = 1;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = mul(root, 2);
    }
    return r;
  }
  function remainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => {
        r[i] ^= mul(c, f);
      });
    }
    return r;
  }
  function encode(text) {
    const data = Array.from(new TextEncoder().encode(text));
    let ver = 1;
    for (; ver <= 10; ver++) {
      const cap = Math.floor(raw(ver) / 8) - ECC[ver - 1] * BLK[ver - 1];
      if (4 + (ver < 10 ? 8 : 16) + data.length * 8 <= cap * 8) break;
    }
    if (ver > 10) throw new Error("QR payload too long");
    const cap = Math.floor(raw(ver) / 8) - ECC[ver - 1] * BLK[ver - 1];
    const bits = [];
    const push = (v, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    };
    push(4, 4);
    push(data.length, ver < 10 ? 8 : 16);
    data.forEach((b) => push(b, 8));
    push(0, Math.min(4, cap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    for (let pad = 0xec; bits.length < cap * 8; pad ^= 0xec ^ 0x11) push(pad, 8);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw.push(b);
    }
    const nb = BLK[ver - 1],
      el = ECC[ver - 1],
      rc = Math.floor(raw(ver) / 8),
      ns = nb - (rc % nb),
      sl = Math.floor(rc / nb);
    const div = divisor(el),
      blocks = [];
    let k = 0;
    for (let i = 0; i < nb; i++) {
      const d = cw.slice(k, k + sl - el + (i < ns ? 0 : 1));
      k += d.length;
      const e = remainder(d, div);
      if (i < ns) d.push(0);
      blocks.push(d.concat(e));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++)
      for (let j = 0; j < nb; j++) if (i !== sl - el || j >= ns) all.push(blocks[j][i]);
    // matrix
    const size = ver * 4 + 17,
      m = [],
      fn = [];
    for (let i = 0; i < size; i++) {
      m.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    const setFn = (x, y, v) => {
      m[y][x] = v;
      fn[y][x] = true;
    };
    for (let i = 0; i < size; i++) {
      setFn(6, i, i % 2 === 0);
      setFn(i, 6, i % 2 === 0);
    }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy)),
            x = cx + dx,
            y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
        }
    };
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    const na = ver === 1 ? 0 : Math.floor(ver / 7) + 2,
      pos = [];
    if (na) {
      const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      pos.push(6);
      for (let i = 0, p = size - 7; i < na - 1; i++, p -= step) pos.splice(1, 0, p);
    }
    for (let i = 0; i < na; i++)
      for (let j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0))
          continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    const drawFormat = (mask) => {
      const d = (1 << 3) | mask;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const bits = ((d << 10) | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i));
      setFn(8, 7, bit(bits, 6));
      setFn(8, 8, bit(bits, 7));
      setFn(7, 8, bit(bits, 8));
      for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i));
      for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i));
      for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i));
      setFn(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const bits = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const c = bit(bits, i),
          a = size - 11 + (i % 3),
          b = Math.floor(i / 3);
        setFn(a, b, c);
        setFn(b, a, c);
      }
    }
    let idx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j,
            up = ((right + 1) & 2) === 0,
            y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && idx < all.length * 8) {
            m[y][x] = bit(all[idx >>> 3], 7 - (idx & 7));
            idx++;
          }
        }
    }
    const applyMask = (mask) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          let inv;
          switch (mask) {
            case 0:
              inv = (x + y) % 2 === 0;
              break;
            case 1:
              inv = y % 2 === 0;
              break;
            case 2:
              inv = x % 3 === 0;
              break;
            case 3:
              inv = (x + y) % 3 === 0;
              break;
            case 4:
              inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
              break;
            case 5:
              inv = ((x * y) % 2) + ((x * y) % 3) === 0;
              break;
            case 6:
              inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
              break;
            default:
              inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
          }
          if (!fn[y][x] && inv) m[y][x] = !m[y][x];
        }
    };
    const penalty = () => {
      let p = 0,
        dark = 0;
      for (let y = 0; y < size; y++) {
        let run = 1;
        for (let x = 1; x < size; x++) {
          if (m[y][x] === m[y][x - 1]) {
            run++;
            if (run === 5) p += 3;
            else if (run > 5) p++;
          } else run = 1;
        }
      }
      for (let x = 0; x < size; x++) {
        let run = 1;
        for (let y = 1; y < size; y++) {
          if (m[y][x] === m[y - 1][x]) {
            run++;
            if (run === 5) p += 3;
            else if (run > 5) p++;
          } else run = 1;
        }
      }
      for (let y = 0; y < size - 1; y++)
        for (let x = 0; x < size - 1; x++) {
          const c = m[y][x];
          if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
        }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x]) dark++;
      const t = size * size;
      p += (Math.ceil(Math.abs(dark * 20 - t * 10) / t) - 1) * 10;
      return p;
    };
    let best = 0,
      bestP = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      applyMask(mask);
      drawFormat(mask);
      const p = penalty();
      if (p < bestP) {
        bestP = p;
        best = mask;
      }
      applyMask(mask);
    }
    applyMask(best);
    drawFormat(best);
    return m;
  }
  function svg(text) {
    const m = encode(text),
      n = m.length,
      q = 4;
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x + q},${y + q}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="Order receipt QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  return { svg, encode };
})();
