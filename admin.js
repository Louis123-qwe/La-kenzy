/* =============================================
   LA'KENZY — ADMIN DASHBOARD
   admin.js — Full Module
   ============================================= */

// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy, where, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== CONFIG =====
// Replace with your Firebase config (same project as main website)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ===== INIT FIREBASE =====
let app, auth, db;
let firebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = true;
} catch (e) {
  console.warn("Firebase not configured. Running in DEMO mode.");
}

// ===== STATE =====
const STATE = {
  appointments: [],
  products: [],
  services: [],
  gallery: [],
  testimonials: [],
  currentPage: "overview",
  deleteTarget: null,
  editTarget: null,
  starRating: 5,
};

// ===== DEMO DATA (used when Firebase not configured) =====
const DEMO_APPOINTMENTS = [
  { id:"a1", ref:"LK4F2XAB", name:"Adaeze Okonkwo", phone:"08012345678", email:"adaeze@gmail.com", service:"Chemical Peels", date:"2026-06-02", time:"10:00 AM", status:"confirmed", notes:"First visit", createdAt: new Date().toISOString() },
  { id:"a2", ref:"LK5G3YCD", name:"Fatima Abdullahi", phone:"09087654321", email:"", service:"Mesotherapy", date:"2026-06-03", time:"02:00 PM", status:"pending", notes:"", createdAt: new Date().toISOString() },
  { id:"a3", ref:"LK6H4ZEF", name:"Chidinma Eze", phone:"08098765432", email:"chidinma@email.com", service:"Facials", date:"2026-06-01", time:"11:00 AM", status:"completed", notes:"Sensitive skin", createdAt: new Date().toISOString() },
  { id:"a4", ref:"LK7I5AGH", name:"Blessing Nwosu", phone:"07065432198", email:"", service:"Microblading", date:"2026-06-05", time:"09:00 AM", status:"pending", notes:"", createdAt: new Date().toISOString() },
  { id:"a5", ref:"LK8J6BIJ", name:"Kemi Olatunji", phone:"08034567890", email:"kemi@gmail.com", service:"Teeth Whitening", date:"2026-06-04", time:"03:00 PM", status:"confirmed", notes:"", createdAt: new Date().toISOString() },
];

const DEMO_PRODUCTS = [
  { id:"p1", name:"Glow Serum 30ml", category:"Serums", price:12500, stock:24, emoji:"✨", desc:"Vitamin C brightening serum", active:true, img:"" },
  { id:"p2", name:"Deep Hydration Cream", category:"Moisturisers", price:9500, stock:18, emoji:"💧", desc:"24hr moisture barrier cream", active:true, img:"" },
  { id:"p3", name:"Exfoliating Toner", category:"Toners", price:7500, stock:30, emoji:"🌿", desc:"AHA/BHA gentle exfoliant", active:true, img:"" },
  { id:"p4", name:"SPF50 Sunscreen", category:"SPF", price:8500, stock:12, emoji:"☀️", desc:"Broad spectrum protection", active:true, img:"" },
  { id:"p5", name:"Cleansing Oil", category:"Cleansers", price:6500, stock:0, emoji:"🫧", desc:"Gentle makeup dissolving oil", active:false, img:"" },
  { id:"p6", name:"Retinol Night Cream", category:"Moisturisers", price:14500, stock:8, emoji:"🌙", desc:"Anti-ageing overnight repair", active:true, img:"" },
];

const DEMO_SERVICES = [
  { id:"s1", name:"Skin Analysis", price:"₦5,000", desc:"Advanced skin assessment using professional diagnostic tools.", emoji:"🔬", duration:"30 mins", active:true },
  { id:"s2", name:"Chemical Peels", price:"₦18,000", desc:"Professional-grade peels that resurface skin and reduce dark spots.", emoji:"🧪", duration:"45 mins", active:true },
  { id:"s3", name:"Mesotherapy", price:"₦25,000", desc:"Micro-injections of vitamins and nutrients for intense rejuvenation.", emoji:"💉", duration:"60 mins", active:true },
  { id:"s4", name:"Facials", price:"₦12,000", desc:"Luxurious facial treatments for deep cleansing and hydration.", emoji:"🌸", duration:"60 mins", active:true },
  { id:"s5", name:"Full Body Massage", price:"₦20,000", desc:"Deeply relaxing full-body massage with premium aromatherapy oils.", emoji:"💆‍♀️", duration:"90 mins", active:true },
  { id:"s6", name:"Microblading", price:"₦35,000", desc:"Semi-permanent brow technique for perfectly shaped brows.", emoji:"🎨", duration:"120 mins", active:true },
];

const DEMO_GALLERY = [
  { id:"g1", label:"Before & After — Skin Treatment", tag:"Skin Treatment", emoji:"✨", size:"tall", url:"" },
  { id:"g2", label:"Facial Treatment Session", tag:"Facials", emoji:"🌸", size:"normal", url:"" },
  { id:"g3", label:"Lash Extension Result", tag:"Lash Extensions", emoji:"👁️", size:"normal", url:"" },
  { id:"g4", label:"Full Body Massage", tag:"Wellness", emoji:"💆‍♀️", size:"wide", url:"" },
];

const DEMO_TESTIMONIALS = [
  { id:"t1", name:"Adaeze Okonkwo", location:"Victoria Island, Lagos", stars:5, text:"LA'KENZY completely transformed my skin. After years of struggling with hyperpigmentation, my skin has never looked more even and glowing.", avatar:"" },
  { id:"t2", name:"Fatima Abdullahi", location:"Abuja", stars:5, text:"I drove all the way from Abuja and it was absolutely worth it. The mesotherapy session was painless and I noticed a visible difference within a week.", avatar:"" },
  { id:"t3", name:"Chidinma Eze", location:"Lekki, Lagos", stars:5, text:"The facials here are absolutely divine. You can tell they use premium products and the estheticians truly understand melanin skin.", avatar:"" },
];

// ===== UTILITIES =====
function toast(msg, type = "success") {
  const t = document.getElementById("adminToast");
  t.textContent = msg;
  t.className = `admin-toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = "admin-toast", 3200);
}

function fmtPrice(n) { return "₦" + Number(n).toLocaleString("en-NG"); }
function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return d; }
}
function genId() { return "_" + Math.random().toString(36).slice(2, 10); }
function genRef() { return "LK" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 4).toUpperCase(); }

// ===== CLOCK =====
function startClock() {
  const el = document.getElementById("topbarTime");
  const greet = document.getElementById("greetTime");
  const update = () => {
    const now = new Date();
    const h = now.getHours();
    el.textContent = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    greet.textContent = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  };
  update();
  setInterval(update, 30000);
}

// ===== AUTH =====
function initAuth() {
  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("loginErr");
  const btn = document.getElementById("loginBtn");
  const toggle = document.getElementById("togglePass");
  const passInput = document.getElementById("loginPass");

  toggle.addEventListener("click", () => {
    const isPass = passInput.type === "password";
    passInput.type = isPass ? "text" : "password";
  });

  if (firebaseReady) {
    onAuthStateChanged(auth, user => {
      if (user) enterDashboard(user);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value;
    if (!email || !pass) { errEl.textContent = "Please fill in all fields."; return; }

    btn.textContent = "Signing in...";
    btn.disabled = true;

    if (firebaseReady) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        enterDashboard(cred.user);
      } catch (err) {
        const msgs = {
          "auth/user-not-found": "No account found with this email.",
          "auth/wrong-password": "Incorrect password.",
          "auth/invalid-email": "Invalid email address.",
          "auth/too-many-requests": "Too many attempts. Please try again later.",
          "auth/invalid-credential": "Invalid email or password.",
        };
        errEl.textContent = msgs[err.code] || "Login failed. Please try again.";
      }
    } else {
      // Demo mode — any login works
      await new Promise(r => setTimeout(r, 800));
      if (email && pass.length >= 4) {
        enterDashboard({ email, displayName: "Admin" });
      } else {
        errEl.textContent = "Demo mode: enter any email and 4+ char password.";
      }
    }
    btn.textContent = "Sign In";
    btn.disabled = false;
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    if (firebaseReady) await signOut(auth);
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("loginScreen").style.display = "flex";
    toast("Signed out successfully.", "info");
  });
}

function enterDashboard(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("adminAvatar").textContent =
    (user.displayName || user.email || "A")[0].toUpperCase();
  loadAllData();
  startClock();
}

// ===== DATA LOADING =====
async function loadAllData() {
  if (firebaseReady) {
    try {
      const [aSnap, pSnap, sSnap, gSnap, tSnap] = await Promise.all([
        getDocs(query(collection(db, "appointments"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "gallery")),
        getDocs(collection(db, "testimonials")),
      ]);
      STATE.appointments = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      STATE.products     = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      STATE.services     = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      STATE.gallery      = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      STATE.testimonials = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Seed services if empty
      if (!STATE.services.length) { STATE.services = DEMO_SERVICES; }
    } catch (err) {
      console.error("Firestore load error:", err);
      loadDemoData();
    }
  } else {
    loadDemoData();
  }
  renderAll();
}

function loadDemoData() {
  STATE.appointments = [...DEMO_APPOINTMENTS];
  STATE.products     = [...DEMO_PRODUCTS];
  STATE.services     = [...DEMO_SERVICES];
  STATE.gallery      = [...DEMO_GALLERY];
  STATE.testimonials = [...DEMO_TESTIMONIALS];
}

function renderAll() {
  renderOverview();
  renderAppointments();
  renderProducts();
  renderServices();
  renderGallery();
  renderTestimonials();
}

// ===== OVERVIEW =====
function renderOverview() {
  const today = new Date().toISOString().split("T")[0];
  const todayAppts = STATE.appointments.filter(a => a.date === today).length;

  document.getElementById("statAppts").textContent     = STATE.appointments.length;
  document.getElementById("statApptToday").textContent = `${todayAppts} today`;
  document.getElementById("statProducts").textContent  = STATE.products.length;
  document.getElementById("statMessages").textContent  = "3";
  document.getElementById("apptBadge").textContent     = STATE.appointments.filter(a => a.status === "pending").length;

  // Estimated revenue from completed appointments
  const completedCount = STATE.appointments.filter(a => a.status === "completed").length;
  document.getElementById("statRevenue").textContent = fmtPrice(completedCount * 15000);

  // Recent appointments
  const recent = STATE.appointments.slice(0, 5);
  const el = document.getElementById("recentAppts");
  if (!recent.length) { el.innerHTML = `<p class="empty-state">No appointments yet.</p>`; return; }
  el.innerHTML = recent.map(a => `
    <div class="recent-appt-item">
      <div class="ra-info">
        <p class="ra-name">${a.name}</p>
        <p class="ra-service">${a.service}</p>
      </div>
      <span class="ra-date">${fmtDate(a.date)} · ${a.time}</span>
      <span class="badge ${a.status}">${a.status}</span>
    </div>
  `).join("");
}

// ===== APPOINTMENTS =====
function renderAppointments(filter = {}) {
  let data = [...STATE.appointments];
  const search = document.getElementById("apptSearch")?.value.toLowerCase() || "";
  const statusF = document.getElementById("apptStatusFilter")?.value || "";
  const serviceF = document.getElementById("apptServiceFilter")?.value || "";

  if (search)   data = data.filter(a => `${a.name} ${a.service} ${a.date} ${a.ref}`.toLowerCase().includes(search));
  if (statusF)  data = data.filter(a => a.status === statusF);
  if (serviceF) data = data.filter(a => a.service === serviceF);

  const body = document.getElementById("apptTableBody");
  const empty = document.getElementById("apptEmpty");

  // Populate service filter
  const sf = document.getElementById("apptServiceFilter");
  if (sf && sf.options.length <= 1) {
    const svcs = [...new Set(STATE.appointments.map(a => a.service))];
    svcs.forEach(s => { const o = document.createElement("option"); o.value = s; o.textContent = s; sf.appendChild(o); });
  }

  if (!data.length) { body.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  body.innerHTML = data.map(a => `
    <tr>
      <td><span class="ref-code">${a.ref || "—"}</span></td>
      <td>
        <div style="font-size:0.85rem;color:var(--cream)">${a.name}</div>
        <div style="font-size:0.72rem;color:var(--muted)">${a.phone}</div>
      </td>
      <td>${a.service}</td>
      <td>${fmtDate(a.date)}<br/><span style="font-size:0.72rem;color:var(--muted)">${a.time}</span></td>
      <td><a href="tel:${a.phone}" style="color:var(--gold)">${a.phone}</a></td>
      <td>
        <select class="status-sel" data-id="${a.id}" style="background:transparent;border:none;font-size:0.78rem;cursor:pointer;color:var(--muted)">
          ${["pending","confirmed","completed","cancelled"].map(s =>
            `<option value="${s}" ${a.status===s?"selected":""}>${s}</option>`).join("")}
        </select>
        <span class="badge ${a.status}">${a.status}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="act-btn edit" onclick="editAppointment('${a.id}')" title="Edit">✏️</button>
          <button class="act-btn wa" onclick="waAppt('${a.id}')" title="WhatsApp">💬</button>
          <button class="act-btn del" onclick="deleteItem('${a.id}','appointment')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");

  // Status quick-change
  body.querySelectorAll(".status-sel").forEach(sel => {
    sel.addEventListener("change", () => updateApptStatus(sel.dataset.id, sel.value));
  });
}

// ===== PRODUCTS =====
function renderProducts(search = "") {
  const data = STATE.products.filter(p =>
    `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );
  const grid = document.getElementById("productsAdminGrid");
  if (!data.length) { grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1">No products found.</p>`; return; }

  grid.innerHTML = data.map(p => `
    <div class="product-admin-card">
      <div class="pac-img">
        ${p.img ? `<img src="${p.img}" alt="${p.name}"/>` : `<span>${p.emoji || "📦"}</span>`}
      </div>
      <div class="pac-body">
        <p class="pac-category">${p.category}</p>
        <h4 class="pac-name">${p.name}</h4>
        <p class="pac-price">${fmtPrice(p.price)}</p>
        <div class="pac-footer">
          <span class="pac-stock">Stock: ${p.stock ?? "—"}</span>
          <span class="badge ${p.active ? "active-p" : "inactive-p"}">${p.active ? "Active" : "Hidden"}</span>
        </div>
        <div class="action-btns" style="margin-top:0.6rem">
          <button class="act-btn edit" onclick="editProduct('${p.id}')">✏️</button>
          <button class="act-btn del" onclick="deleteItem('${p.id}','product')">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ===== SERVICES =====
function renderServices() {
  const grid = document.getElementById("servicesAdminGrid");
  grid.innerHTML = STATE.services.map(s => `
    <div class="service-admin-card">
      <div class="sac-icon">${s.emoji || "✨"}</div>
      <div class="sac-body">
        <h4 class="sac-name">${s.name}</h4>
        <p class="sac-price">From ${s.price}${s.duration ? ` · ${s.duration}` : ""}</p>
        <p class="sac-desc">${s.desc}</p>
        <span class="badge ${s.active ? "active-p" : "inactive-p"}" style="margin-bottom:0.5rem;display:inline-flex">${s.active ? "Available" : "Unavailable"}</span>
        <div class="sac-actions">
          <button class="act-btn edit" onclick="editService('${s.id}')">✏️ Edit</button>
          <button class="act-btn del" onclick="deleteItem('${s.id}','service')">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ===== GALLERY =====
function renderGallery() {
  const grid = document.getElementById("galleryAdminGrid");
  if (!STATE.gallery.length) { grid.innerHTML = `<p class="empty-state">No gallery items yet.</p>`; return; }
  grid.innerHTML = STATE.gallery.map(g => `
    <div class="gallery-admin-item">
      <div class="gai-img">
        ${g.url ? `<img src="${g.url}" alt="${g.label}"/>` : `<span>${g.emoji || "🖼️"}</span>`}
      </div>
      <div class="gai-body">
        <p class="gai-tag">${g.tag || "Gallery"}</p>
        <p class="gai-label">${g.label}</p>
        <div class="gai-actions">
          <button class="act-btn edit" onclick="editGallery('${g.id}')">✏️</button>
          <button class="act-btn del" onclick="deleteItem('${g.id}','gallery')">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ===== TESTIMONIALS =====
function renderTestimonials() {
  const grid = document.getElementById("testiAdminGrid");
  if (!STATE.testimonials.length) { grid.innerHTML = `<p class="empty-state">No testimonials yet.</p>`; return; }
  grid.innerHTML = STATE.testimonials.map(t => `
    <div class="testi-admin-card">
      <div class="tac-stars">${"★".repeat(t.stars)}</div>
      <p class="tac-text">"${t.text}"</p>
      <div class="tac-author">
        <div>
          <p class="tac-name">${t.name}</p>
          <p class="tac-loc">${t.location || ""}</p>
        </div>
        <div class="action-btns">
          <button class="act-btn edit" onclick="editTesti('${t.id}')">✏️</button>
          <button class="act-btn del" onclick="deleteItem('${t.id}','testimonial')">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ===== NAVIGATION =====
function initNav() {
  document.querySelectorAll(".nav-item, .panel-link, .qa-btn").forEach(btn => {
    const page = btn.dataset.page;
    if (!page) return;
    btn.addEventListener("click", () => switchPage(page));
  });

  document.getElementById("sidebarToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

function switchPage(page) {
  STATE.currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.page === page));
  document.getElementById("topbarTitle").textContent =
    page.charAt(0).toUpperCase() + page.slice(1);
  document.getElementById("sidebar").classList.remove("open");
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

function initModals() {
  document.querySelectorAll(".modal-close, [data-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.modal;
      if (id) closeModal(id);
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(m => {
    m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("open"); });
  });
}

// ===== APPOINTMENT CRUD =====
document.getElementById("newApptBtn")?.addEventListener("click", () => {
  resetForm("apptForm");
  document.getElementById("apptModalTitle").textContent = "New Appointment";
  document.getElementById("af_ref").value = genRef();
  document.getElementById("af_date").min = new Date().toISOString().split("T")[0];
  STATE.editTarget = null;
  openModal("apptModal");
});

document.getElementById("apptForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const appt = {
    name:    document.getElementById("af_name").value.trim(),
    phone:   document.getElementById("af_phone").value.trim(),
    email:   document.getElementById("af_email").value.trim(),
    service: document.getElementById("af_service").value,
    date:    document.getElementById("af_date").value,
    time:    document.getElementById("af_time").value,
    status:  document.getElementById("af_status").value,
    ref:     document.getElementById("af_ref").value || genRef(),
    notes:   document.getElementById("af_notes").value.trim(),
  };
  if (!appt.name || !appt.phone || !appt.service || !appt.date || !appt.time) {
    toast("Fill in all required fields.", "error"); return;
  }

  if (STATE.editTarget) {
    // Update
    if (firebaseReady) await updateDoc(doc(db, "appointments", STATE.editTarget), appt);
    const i = STATE.appointments.findIndex(a => a.id === STATE.editTarget);
    if (i > -1) STATE.appointments[i] = { ...STATE.appointments[i], ...appt };
    toast("Appointment updated ✦");
  } else {
    // Create
    const newAppt = { ...appt, createdAt: new Date().toISOString() };
    if (firebaseReady) {
      const ref = await addDoc(collection(db, "appointments"), { ...newAppt, createdAt: serverTimestamp() });
      newAppt.id = ref.id;
    } else {
      newAppt.id = genId();
    }
    STATE.appointments.unshift(newAppt);
    toast("Appointment added ✦");
  }
  closeModal("apptModal");
  renderAppointments();
  renderOverview();
});

window.editAppointment = function(id) {
  const a = STATE.appointments.find(x => x.id === id);
  if (!a) return;
  STATE.editTarget = id;
  document.getElementById("apptModalTitle").textContent = "Edit Appointment";
  document.getElementById("af_name").value    = a.name || "";
  document.getElementById("af_phone").value   = a.phone || "";
  document.getElementById("af_email").value   = a.email || "";
  document.getElementById("af_service").value = a.service || "";
  document.getElementById("af_date").value    = a.date || "";
  document.getElementById("af_time").value    = a.time || "";
  document.getElementById("af_status").value  = a.status || "pending";
  document.getElementById("af_ref").value     = a.ref || "";
  document.getElementById("af_notes").value   = a.notes || "";
  openModal("apptModal");
};

window.waAppt = function(id) {
  const a = STATE.appointments.find(x => x.id === id);
  if (!a) return;
  const msg = encodeURIComponent(`Hello ${a.name}! 👋\n\nThis is LA'KENZY Skincare & Aesthetic Spa.\n\nYour appointment has been *${a.status}*:\n\n📋 Service: ${a.service}\n📅 Date: ${fmtDate(a.date)}\n⏰ Time: ${a.time}\n🔖 Ref: ${a.ref}\n\nPlease arrive 5 minutes early. We look forward to seeing you! ✨`);
  window.open(`https://wa.me/${a.phone.replace(/^0/, "234")}?text=${msg}`, "_blank");
};

async function updateApptStatus(id, status) {
  if (firebaseReady) await updateDoc(doc(db, "appointments", id), { status });
  const i = STATE.appointments.findIndex(a => a.id === id);
  if (i > -1) STATE.appointments[i].status = status;
  renderAppointments();
  renderOverview();
  toast(`Status updated to ${status}`);
}

// ===== PRODUCT CRUD =====
document.getElementById("newProductBtn")?.addEventListener("click", () => {
  resetForm("productForm");
  document.getElementById("productModalTitle").textContent = "Add Product";
  document.getElementById("pf_active").checked = true;
  STATE.editTarget = null;
  openModal("productModal");
});

document.getElementById("productForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prod = {
    name:     document.getElementById("pf_name").value.trim(),
    category: document.getElementById("pf_category").value,
    price:    Number(document.getElementById("pf_price").value),
    stock:    Number(document.getElementById("pf_stock").value),
    desc:     document.getElementById("pf_desc").value.trim(),
    emoji:    document.getElementById("pf_emoji").value.trim() || "📦",
    img:      document.getElementById("pf_img").value.trim(),
    active:   document.getElementById("pf_active").checked,
  };
  if (!prod.name || !prod.category || !prod.price) {
    toast("Fill in all required fields.", "error"); return;
  }

  if (STATE.editTarget) {
    if (firebaseReady) await updateDoc(doc(db, "products", STATE.editTarget), prod);
    const i = STATE.products.findIndex(p => p.id === STATE.editTarget);
    if (i > -1) STATE.products[i] = { ...STATE.products[i], ...prod };
    toast("Product updated ✦");
  } else {
    const newProd = { ...prod };
    if (firebaseReady) {
      const ref = await addDoc(collection(db, "products"), newProd);
      newProd.id = ref.id;
    } else {
      newProd.id = genId();
    }
    STATE.products.unshift(newProd);
    toast("Product added ✦");
  }
  closeModal("productModal");
  renderProducts();
  renderOverview();
});

window.editProduct = function(id) {
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;
  STATE.editTarget = id;
  document.getElementById("productModalTitle").textContent = "Edit Product";
  document.getElementById("pf_name").value     = p.name || "";
  document.getElementById("pf_category").value = p.category || "";
  document.getElementById("pf_price").value    = p.price || "";
  document.getElementById("pf_stock").value    = p.stock || 0;
  document.getElementById("pf_desc").value     = p.desc || "";
  document.getElementById("pf_emoji").value    = p.emoji || "";
  document.getElementById("pf_img").value      = p.img || "";
  document.getElementById("pf_active").checked = !!p.active;
  openModal("productModal");
};

// ===== SERVICE CRUD =====
document.getElementById("newServiceBtn")?.addEventListener("click", () => {
  resetForm("serviceForm");
  document.getElementById("serviceModalTitle").textContent = "Add Service";
  document.getElementById("sf_active").checked = true;
  STATE.editTarget = null;
  openModal("serviceModal");
});

document.getElementById("serviceForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const svc = {
    name:     document.getElementById("sf_name").value.trim(),
    price:    document.getElementById("sf_price").value.trim(),
    desc:     document.getElementById("sf_desc").value.trim(),
    emoji:    document.getElementById("sf_emoji").value.trim() || "✨",
    duration: document.getElementById("sf_duration").value.trim(),
    active:   document.getElementById("sf_active").checked,
  };
  if (!svc.name || !svc.price || !svc.desc) { toast("Fill in required fields.", "error"); return; }

  if (STATE.editTarget) {
    if (firebaseReady) await updateDoc(doc(db, "services", STATE.editTarget), svc);
    const i = STATE.services.findIndex(s => s.id === STATE.editTarget);
    if (i > -1) STATE.services[i] = { ...STATE.services[i], ...svc };
    toast("Service updated ✦");
  } else {
    const ns = { ...svc };
    if (firebaseReady) { const r = await addDoc(collection(db, "services"), ns); ns.id = r.id; }
    else ns.id = genId();
    STATE.services.push(ns);
    toast("Service added ✦");
  }
  closeModal("serviceModal");
  renderServices();
});

window.editService = function(id) {
  const s = STATE.services.find(x => x.id === id);
  if (!s) return;
  STATE.editTarget = id;
  document.getElementById("serviceModalTitle").textContent = "Edit Service";
  document.getElementById("sf_name").value     = s.name || "";
  document.getElementById("sf_price").value    = s.price || "";
  document.getElementById("sf_desc").value     = s.desc || "";
  document.getElementById("sf_emoji").value    = s.emoji || "";
  document.getElementById("sf_duration").value = s.duration || "";
  document.getElementById("sf_active").checked = !!s.active;
  openModal("serviceModal");
};

// ===== GALLERY CRUD =====
document.getElementById("newGalleryBtn")?.addEventListener("click", () => {
  resetForm("galleryForm");
  STATE.editTarget = null;
  openModal("galleryModal");
});

document.getElementById("galleryForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const item = {
    label: document.getElementById("gf_label").value.trim(),
    tag:   document.getElementById("gf_tag").value.trim(),
    url:   document.getElementById("gf_url").value.trim(),
    size:  document.getElementById("gf_size").value,
    emoji: "🖼️",
  };
  if (!item.label || !item.url) { toast("Fill in required fields.", "error"); return; }

  if (STATE.editTarget) {
    if (firebaseReady) await updateDoc(doc(db, "gallery", STATE.editTarget), item);
    const i = STATE.gallery.findIndex(g => g.id === STATE.editTarget);
    if (i > -1) STATE.gallery[i] = { ...STATE.gallery[i], ...item };
    toast("Image updated ✦");
  } else {
    if (firebaseReady) { const r = await addDoc(collection(db, "gallery"), item); item.id = r.id; }
    else item.id = genId();
    STATE.gallery.push(item);
    toast("Image added ✦");
  }
  closeModal("galleryModal");
  renderGallery();
});

window.editGallery = function(id) {
  const g = STATE.gallery.find(x => x.id === id);
  if (!g) return;
  STATE.editTarget = id;
  document.getElementById("gf_label").value = g.label || "";
  document.getElementById("gf_tag").value   = g.tag || "";
  document.getElementById("gf_url").value   = g.url || "";
  document.getElementById("gf_size").value  = g.size || "normal";
  openModal("galleryModal");
};

// ===== TESTIMONIAL CRUD =====
document.getElementById("newTestiBtn")?.addEventListener("click", () => {
  resetForm("testiForm");
  document.getElementById("testiModalTitle").textContent = "Add Testimonial";
  STATE.editTarget = null;
  STATE.starRating = 5;
  updateStarUI(5);
  openModal("testiModal");
});

document.getElementById("testiForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const t = {
    name:     document.getElementById("tf_name").value.trim(),
    location: document.getElementById("tf_loc").value.trim(),
    stars:    STATE.starRating,
    text:     document.getElementById("tf_text").value.trim(),
    avatar:   document.getElementById("tf_avatar").value.trim(),
  };
  if (!t.name || !t.text) { toast("Fill in required fields.", "error"); return; }

  if (STATE.editTarget) {
    if (firebaseReady) await updateDoc(doc(db, "testimonials", STATE.editTarget), t);
    const i = STATE.testimonials.findIndex(x => x.id === STATE.editTarget);
    if (i > -1) STATE.testimonials[i] = { ...STATE.testimonials[i], ...t };
    toast("Testimonial updated ✦");
  } else {
    if (firebaseReady) { const r = await addDoc(collection(db, "testimonials"), t); t.id = r.id; }
    else t.id = genId();
    STATE.testimonials.push(t);
    toast("Testimonial added ✦");
  }
  closeModal("testiModal");
  renderTestimonials();
});

window.editTesti = function(id) {
  const t = STATE.testimonials.find(x => x.id === id);
  if (!t) return;
  STATE.editTarget = id;
  document.getElementById("testiModalTitle").textContent = "Edit Testimonial";
  document.getElementById("tf_name").value   = t.name || "";
  document.getElementById("tf_loc").value    = t.location || "";
  document.getElementById("tf_text").value   = t.text || "";
  document.getElementById("tf_avatar").value = t.avatar || "";
  STATE.starRating = t.stars || 5;
  updateStarUI(STATE.starRating);
  openModal("testiModal");
};

// Star picker
function updateStarUI(n) {
  document.getElementById("tf_stars").value = n;
  document.querySelectorAll(".star-picker button").forEach((btn, i) => {
    btn.classList.toggle("active", i < n);
  });
}
document.querySelectorAll(".star-picker button").forEach(btn => {
  btn.addEventListener("click", () => {
    STATE.starRating = parseInt(btn.dataset.star);
    updateStarUI(STATE.starRating);
  });
});

// ===== DELETE =====
window.deleteItem = function(id, type) {
  STATE.deleteTarget = { id, type };
  openModal("confirmModal");
};

document.getElementById("confirmDeleteBtn")?.addEventListener("click", async () => {
  const { id, type } = STATE.deleteTarget || {};
  if (!id || !type) return;

  const collMap = { appointment:"appointments", product:"products", service:"services", gallery:"gallery", testimonial:"testimonials" };
  const stateMap = { appointment:"appointments", product:"products", service:"services", gallery:"gallery", testimonial:"testimonials" };

  if (firebaseReady && collMap[type]) {
    try { await deleteDoc(doc(db, collMap[type], id)); } catch(e) { console.warn(e); }
  }
  STATE[stateMap[type]] = STATE[stateMap[type]].filter(i => i.id !== id);

  closeModal("confirmModal");
  renderAll();
  toast("Item deleted.");
});

// ===== SETTINGS FORMS =====
document.getElementById("bizForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  toast("Business info saved ✦");
});
document.getElementById("adminForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  toast("Account updated ✦");
});

// ===== SEARCH LISTENERS =====
document.getElementById("apptSearch")?.addEventListener("input", () => renderAppointments());
document.getElementById("apptStatusFilter")?.addEventListener("change", () => renderAppointments());
document.getElementById("apptServiceFilter")?.addEventListener("change", () => renderAppointments());
document.getElementById("prodSearch")?.addEventListener("input", (e) => renderProducts(e.target.value));

// ===== UTILS =====
function resetForm(id) {
  document.getElementById(id)?.reset();
  STATE.editTarget = null;
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initNav();
  initModals();
  updateStarUI(5);

  // Orders placeholder
  document.getElementById("ordersEmpty").style.display = "block";
});

/* ===== AUDIT FIXES (appended) ===== */

// FIX: Patch initNav to add sidebar overlay support and body scroll lock
(function patchSidebarOverlay() {
  // Inject overlay element into DOM if it doesn't exist
  if (!document.getElementById("sidebarOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!toggle || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("open");
    overlay.style.display = "block";
    document.body.style.overflow = "hidden";
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    toggle.setAttribute("aria-expanded", "false");
    setTimeout(() => { overlay.style.display = ""; }, 350);
  }

  // Replace old click handler by cloning the toggle button
  const newToggle = toggle.cloneNode(true);
  toggle.parentNode.replaceChild(newToggle, toggle);
  newToggle.setAttribute("aria-expanded", "false");
  newToggle.setAttribute("aria-label", "Toggle sidebar");
  newToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) { closeSidebar(); } else { openSidebar(); }
  });

  // Overlay click closes sidebar
  overlay.addEventListener("click", closeSidebar);

  // Escape key closes sidebar on mobile
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("open")) closeSidebar();
  });

  // Patch switchPage to close sidebar via our function
  const origSwitchPage = window.switchPage;
  window.switchPage = function(page) {
    closeSidebar();
    if (origSwitchPage) origSwitchPage(page);
  };
})();

// FIX: Add Escape key support for modals in admin
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.open").forEach(m => {
      m.classList.remove("open");
    });
  }
});
