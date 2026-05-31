// ═══════════════════════════════════════════════════════════════════
//  LA'KENZY ADMIN PANEL — admin.js
//  Firebase v10 Modular SDK (type="module")
// ═══════════════════════════════════════════════════════════════════

// ── IMPORTS & FIREBASE INIT ────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, onSnapshot, query, orderBy, where,
  serverTimestamp, writeBatch, getCountFromServer, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── FIREBASE CONFIG ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDzqvg6xz-acaxKrKEQ7Ht5M9mzcrGAIhw",
  authDomain: "asset-stack.firebaseapp.com",
  databaseURL: "https://asset-stack-default-rtdb.firebaseio.com",
  projectId: "asset-stack",
  storageBucket: "asset-stack.firebasestorage.app",
  messagingSenderId: "324975878662",
  appId: "1:324975878662:web:91f270faa2d57151ad9987",
  measurementId: "G-RTYN401K15"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ── CLOUDINARY CONFIG ──────────────────────────────────────────────
let cloudinaryConfig = { cloudName: '', uploadPreset: '' };

async function loadCloudinaryConfig() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'cloudinaryConfig'));
    if (snap.exists()) cloudinaryConfig = snap.data();
  } catch (e) { /* silent */ }
}

function openCloudinaryWidget(onSuccess) {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    showToast('Configure Cloudinary in Settings first', 'warning');
    showSection('settings');
    return;
  }
  cloudinary.openUploadWidget({
    cloudName: cloudinaryConfig.cloudName,
    uploadPreset: cloudinaryConfig.uploadPreset,
    sources: ['local', 'url', 'camera'],
    multiple: false,
    cropping: true,
    croppingAspectRatio: 1,
    folder: 'lakenzy/products',
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 5000000
  }, (err, result) => {
    if (!err && result.event === 'success') {
      onSuccess(result.info.secure_url);
    }
  });
}

// ── CLICK TRACKING NOTE ────────────────────────────────────────────
/*
  CLICK TRACKING — implemented on the storefront (not admin panel).
  When a visitor clicks a product on the public site:
    updateDoc(productRef, { clicks: increment(1) })
  When a visitor clicks the WhatsApp button:
    updateDoc(productRef, { whatsappClicks: increment(1) })
    addDoc(collection(db,'analytics'), { type:'whatsappClick', productId, timestamp: serverTimestamp() })
  These counts are read here in Products and Analytics sections.
*/

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════
const loginScreen   = document.getElementById('loginScreen');
const adminWrapper  = document.getElementById('adminWrapper');
const loginEmailEl  = document.getElementById('loginEmail');
const loginPassEl   = document.getElementById('loginPassword');
const loginBtn      = document.getElementById('loginBtn');
const loginError    = document.getElementById('loginError');
const logoutBtn     = document.getElementById('logoutBtn');
const topBarEmail   = document.getElementById('topBarEmail');

loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const email = loginEmailEl.value.trim();
  const pass  = loginPassEl.value;
  if (!email || !pass) { loginError.textContent = 'Please enter email and password.'; return; }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    loginError.textContent = friendlyAuthError(e.code);
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
});

loginPassEl.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });

logoutBtn.addEventListener('click', async () => {
  if (await confirmModal('Are you sure you want to logout?')) signOut(auth);
});

function friendlyAuthError(code) {
  const map = {
    'auth/wrong-password':      'Incorrect password.',
    'auth/user-not-found':      'No account found with that email.',
    'auth/invalid-email':       'Invalid email address.',
    'auth/too-many-requests':   'Too many attempts. Please try later.',
    'auth/invalid-credential':  'Invalid email or password.'
  };
  return map[code] || 'Authentication failed. Please try again.';
}

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.classList.add('hidden');
    adminWrapper.classList.remove('hidden');
    topBarEmail.textContent = user.email;
    const settingsEmail = document.getElementById('settingsEmail');
    if (settingsEmail) settingsEmail.textContent = user.email;
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    initApp();
  } else {
    loginScreen.classList.remove('hidden');
    adminWrapper.classList.add('hidden');
  }
});

// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════
const sectionLoaders = {};
let currentSection = 'dashboard';

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  const sec = document.getElementById(`sec-${id}`);
  if (sec) sec.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === id);
  });

  const titles = {
    dashboard: 'Dashboard', products: 'Products', services: 'Services',
    appointments: 'Appointments', testimonials: 'Testimonials',
    analytics: 'Analytics', inventory: 'Inventory',
    sales: 'Sales Records', settings: 'Settings'
  };
  document.getElementById('topBarTitle').textContent = titles[id] || id;
  currentSection = id;

  if (sectionLoaders[id]) sectionLoaders[id]();

  // close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
  }
}

window.showSection = showSection;

// Nav item clicks
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', () => showSection(item.dataset.section));
});

// Sidebar toggle
const sidebarToggleBtn = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
sidebarToggleBtn.addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
      document.body.appendChild(overlay);
    }
    overlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
  } else {
    sidebar.classList.toggle('collapsed');
  }
});

// ═══════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════
function showToast(message, type = 'info') {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function openModal(titleHTML, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').innerHTML = titleHTML;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('adminModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('adminModal').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modalFooter').innerHTML = '';
}

document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('adminModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

function confirmModal(message) {
  return new Promise(resolve => {
    openModal(
      'Confirm Action',
      `<p style="color:var(--text-muted);">${message}</p>`,
      `<button class="btn-ghost" id="confirmNo">Cancel</button>
       <button class="btn-danger" id="confirmYes">Yes, Proceed</button>`
    );
    document.getElementById('confirmYes').onclick = () => { closeModal(); resolve(true); };
    document.getElementById('confirmNo').onclick  = () => { closeModal(); resolve(false); };
  });
}

function formatPrice(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG');
}

function formatDate(ts) {
  if (!ts) return '—';
  let d;
  if (ts && ts.toDate) d = ts.toDate();
  else if (ts instanceof Date) d = ts;
  else d = new Date(ts);
  const day  = String(d.getDate()).padStart(2,'0');
  const mon  = d.toLocaleString('en-GB', { month: 'short' });
  const yr   = d.getFullYear();
  const hr   = String(d.getHours()).padStart(2,'0');
  const mi   = String(d.getMinutes()).padStart(2,'0');
  return `${day} ${mon} ${yr}, ${hr}:${mi}`;
}

function formatDateShort(ts) {
  if (!ts) return '—';
  let d;
  if (ts && ts.toDate) d = ts.toDate();
  else if (ts instanceof Date) d = ts;
  else d = new Date(ts);
  return d.toISOString().slice(0, 10);
}

function generateRef() {
  return 'LK' + Date.now().toString(36).toUpperCase().slice(-6) +
    Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════
//  EXPORT — PDF
// ═══════════════════════════════════════════════════════════════════
// TODO: Replace addLogoToPDF() stub with base64 logo string for branded PDF logo.
// To add: const logoBase64 = "data:image/png;base64,YOUR_BASE64_STRING";
//         doc.addImage(logoBase64, 'PNG', 14, 10, 30, 15);

function exportToPDF(title, columns, rows, summaryLines = [], orientation = 'landscape') {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header — brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(212, 175, 55);
  doc.text("LA'KENZY", 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text('Skincare & Aesthetics Spa', 14, y);
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Omu-Arogun Bus-Stop, Lagos  |  08039239749  |  09053563695', 14, y);
  y += 5;

  // Gold line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  // Report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, y);
  y += 10;

  // AutoTable
  doc.autoTable({
    startY: y,
    head: [columns],
    body: rows,
    headStyles:          { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
    alternateRowStyles:  { fillColor: [26, 26, 26] },
    bodyStyles:          { fillColor: [17, 17, 17], textColor: [255, 255, 255] },
    styles:              { fontSize: 9, cellPadding: 3 },
    margin:              { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${new Date().toLocaleString()}  ·  LA'KENZY Admin Panel`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
  });

  // Summary lines
  if (summaryLines.length) {
    let sy = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    summaryLines.forEach(line => {
      doc.text(line, 14, sy);
      sy += 5;
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`lakenzy-${title.toLowerCase().replace(/\s+/g, '-')}-${today}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════
//  EXPORT — CSV
// ═══════════════════════════════════════════════════════════════════
function exportToCSV(filename, columns, rows) {
  const escape = val => {
    const s = String(val ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const lines = [
    columns.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(','))
  ];
  const content = '\uFEFF' + lines.join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
//  ICON PICKER COMPONENT
// ═══════════════════════════════════════════════════════════════════
const ICONS = [
  { cls: 'fas fa-bottle-droplet',    label: 'Bottle' },
  { cls: 'fas fa-spa',               label: 'Spa' },
  { cls: 'fas fa-star',              label: 'Star' },
  { cls: 'fas fa-leaf',              label: 'Leaf' },
  { cls: 'fas fa-heart',             label: 'Heart' },
  { cls: 'fas fa-gem',               label: 'Gem' },
  { cls: 'fas fa-seedling',          label: 'Seedling' },
  { cls: 'fas fa-sun',               label: 'Sun' },
  { cls: 'fas fa-moon',              label: 'Moon' },
  { cls: 'fas fa-droplet',           label: 'Droplet' },
  { cls: 'fas fa-fire',              label: 'Fire' },
  { cls: 'fas fa-snowflake',         label: 'Snow' },
  { cls: 'fas fa-feather',           label: 'Feather' },
  { cls: 'fas fa-eye',               label: 'Eye' },
  { cls: 'fas fa-hand-sparkles',     label: 'Sparkle' },
  { cls: 'fas fa-hands',             label: 'Hands' },
  { cls: 'fas fa-face-smile',        label: 'Smile' },
  { cls: 'fas fa-crown',             label: 'Crown' },
  { cls: 'fas fa-ribbon',            label: 'Ribbon' },
  { cls: 'fas fa-shield-halved',     label: 'Shield' },
  { cls: 'fas fa-paintbrush',        label: 'Brush' },
  { cls: 'fas fa-scissors',          label: 'Scissors' },
  { cls: 'fas fa-pump-soap',         label: 'Soap' },
  { cls: 'fas fa-flask',             label: 'Flask' },
  { cls: 'fas fa-microscope',        label: 'Science' },
  { cls: 'fas fa-prescription-bottle', label: 'Bottle2' },
  { cls: 'fas fa-mortar-pestle',     label: 'Mortar' },
  { cls: 'fas fa-syringe',           label: 'Syringe' },
  { cls: 'fas fa-pills',             label: 'Pills' },
  { cls: 'fas fa-stethoscope',       label: 'Medical' },
  { cls: 'fas fa-user-nurse',        label: 'Nurse' },
  { cls: 'fas fa-magic',             label: 'Magic' },
  { cls: 'fas fa-wand-sparkles',     label: 'Wand' },
  { cls: 'fas fa-palette',           label: 'Palette' },
  { cls: 'fas fa-tint',              label: 'Tint' },
  { cls: 'fas fa-shower',            label: 'Shower' },
  { cls: 'fas fa-bath',              label: 'Bath' },
  { cls: 'fas fa-hot-tub-person',    label: 'HotTub' },
  { cls: 'fas fa-person-dress',      label: 'Person' },
  { cls: 'fas fa-venus',             label: 'Venus' },
  { cls: 'fas fa-diamond',           label: 'Diamond' },
  { cls: 'fas fa-gift',              label: 'Gift' },
  { cls: 'fas fa-box',               label: 'Box' },
  { cls: 'fas fa-bag-shopping',      label: 'Bag' },
  { cls: 'fas fa-tag',               label: 'Tag' },
  { cls: 'fas fa-percent',           label: 'Percent' },
  { cls: 'fas fa-award',             label: 'Award' },
  { cls: 'fas fa-medal',             label: 'Medal' },
  { cls: 'fas fa-certificate',       label: 'Cert' },
  { cls: 'fas fa-check-circle',      label: 'Check' },
  { cls: 'fas fa-clock',             label: 'Clock' },
  { cls: 'fas fa-calendar',          label: 'Calendar' },
  { cls: 'fas fa-map-marker-alt',    label: 'Location' },
  { cls: 'fas fa-phone',             label: 'Phone' },
  { cls: 'fab fa-whatsapp',          label: 'WhatsApp' },
  { cls: 'fas fa-envelope',          label: 'Email' },
  { cls: 'fas fa-globe',             label: 'Globe' },
  { cls: 'fas fa-camera',            label: 'Camera' },
  { cls: 'fas fa-image',             label: 'Image' },
  { cls: 'fas fa-smog',              label: 'Mist' }
];

function buildIconPicker(wrapId, inputId, triggerBtnId) {
  const wrap     = document.getElementById(wrapId);
  const input    = document.getElementById(inputId);
  const trigBtn  = document.getElementById(triggerBtnId);
  if (!wrap || !input || !trigBtn) return;

  let dropOpen = false;
  let selectedCls = input.value || ICONS[0].cls;

  function renderTrigger() {
    trigBtn.innerHTML = `<i class="${selectedCls}"></i><span style="margin-left:0.5rem;color:var(--text-muted);font-size:0.78rem;">${selectedCls}</span>`;
    input.value = selectedCls;
  }
  renderTrigger();

  trigBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropOpen = !dropOpen;
    let dd = document.getElementById(wrapId + '_dropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = wrapId + '_dropdown';
      dd.className = 'icon-picker-dropdown';
      dd.innerHTML = `
        <div class="icon-picker-search"><input type="text" placeholder="Search icons…" id="${wrapId}_search" /></div>
        <div class="icon-grid" id="${wrapId}_grid"></div>`;
      wrap.appendChild(dd);
      renderIconGrid(dd.querySelector(`#${wrapId}_grid`), '');
      dd.querySelector(`#${wrapId}_search`).addEventListener('input', function() {
        renderIconGrid(dd.querySelector(`#${wrapId}_grid`), this.value.toLowerCase());
      });
    }
    dd.style.display = dropOpen ? 'block' : 'none';
  });

  document.addEventListener('click', e => {
    const dd = document.getElementById(wrapId + '_dropdown');
    if (dd && !wrap.contains(e.target)) { dd.style.display = 'none'; dropOpen = false; }
  });

  function renderIconGrid(grid, filter) {
    const filtered = filter ? ICONS.filter(ic => ic.label.toLowerCase().includes(filter) || ic.cls.includes(filter)) : ICONS;
    grid.innerHTML = filtered.map(ic => `
      <div class="icon-item${ic.cls === selectedCls ? ' selected' : ''}" data-cls="${ic.cls}" title="${ic.cls}">
        <i class="${ic.cls}"></i><span>${ic.label}</span>
      </div>`).join('');
    grid.querySelectorAll('.icon-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedCls = el.dataset.cls;
        input.value = selectedCls;
        renderTrigger();
        const dd = document.getElementById(wrapId + '_dropdown');
        if (dd) dd.style.display = 'none';
        dropOpen = false;
        grid.querySelectorAll('.icon-item').forEach(x => x.classList.toggle('selected', x.dataset.cls === selectedCls));
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════
let dashUnsubscribes = [];

function loadDashboard() {
  dashUnsubscribes.forEach(u => u());
  dashUnsubscribes = [];

  // Products count
  const u1 = onSnapshot(collection(db, 'products'), snap => {
    document.getElementById('statProducts').textContent = snap.size;
  });
  dashUnsubscribes.push(u1);

  // Pending appointments
  const u2 = onSnapshot(query(collection(db, 'appointments'), where('status', '==', 'pending')), snap => {
    document.getElementById('statPending').textContent = snap.size;
  });
  dashUnsubscribes.push(u2);

  // Total revenue
  const u3 = onSnapshot(collection(db, 'salesRecords'), snap => {
    let total = 0;
    snap.forEach(d => total += (d.data().totalAmount || 0));
    document.getElementById('statRevenue').textContent = formatPrice(total);
  });
  dashUnsubscribes.push(u3);

  // Low stock
  const u4 = onSnapshot(collection(db, 'products'), snap => {
    let low = 0;
    snap.forEach(d => {
      const p = d.data();
      if ((p.stock || 0) <= (p.reorderLevel || 0)) low++;
    });
    document.getElementById('statLowStock').textContent = low;
  });
  dashUnsubscribes.push(u4);

  // WhatsApp clicks
  const u5 = onSnapshot(query(collection(db, 'analytics'), where('type', '==', 'whatsappClick')), snap => {
    document.getElementById('statWaClicks').textContent = snap.size;
  });
  dashUnsubscribes.push(u5);

  // Product clicks
  const u6 = onSnapshot(query(collection(db, 'analytics'), where('type', '==', 'productClick')), snap => {
    document.getElementById('statProdClicks').textContent = snap.size;
  });
  dashUnsubscribes.push(u6);

  // Recent appointments (last 5)
  const u7 = onSnapshot(query(collection(db, 'appointments'), orderBy('createdAt', 'desc')), snap => {
    const tbody = document.getElementById('dashRecentAppointments');
    const docs  = snap.docs.slice(0, 5);
    if (!docs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No appointments yet</td></tr>';
      return;
    }
    tbody.innerHTML = docs.map(d => {
      const a = d.data();
      return `<tr>
        <td><code style="color:var(--gold);font-size:0.75rem;">${a.ref || '—'}</code></td>
        <td>${a.name || '—'}</td>
        <td>${a.service || '—'}</td>
        <td>${a.date || '—'}</td>
        <td>${badgeHtml(a.status)}</td>
      </tr>`;
    }).join('');
  });
  dashUnsubscribes.push(u7);

  // Monthly chart
  const u8 = onSnapshot(collection(db, 'appointments'), snap => {
    const year = new Date().getFullYear();
    const months = Array(12).fill(0);
    snap.forEach(d => {
      const ts = d.data().createdAt;
      if (!ts) return;
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      if (date.getFullYear() === year) months[date.getMonth()]++;
    });
    renderBarChart('dashChartWrap', months, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);
  });
  dashUnsubscribes.push(u8);
}

function renderBarChart(containerId, values, labels) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const max = Math.max(...values, 1);
  wrap.innerHTML = values.map((v, i) => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${labels[i]}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(v/max*100).toFixed(1)}%"></div>
      </div>
      <div class="chart-bar-value">${v}</div>
    </div>`).join('');
}

function badgeHtml(status) {
  const map = { pending: 'badge-pending', confirmed: 'badge-confirmed', cancelled: 'badge-cancelled', active: 'badge-active', inactive: 'badge-inactive' };
  return `<span class="badge ${map[status] || 'badge-inactive'}">${status || 'unknown'}</span>`;
}

sectionLoaders['dashboard'] = loadDashboard;

// ═══════════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════════
let allProducts = [];
let productUnsub = null;
let productCatFilter = 'all';
let productSearch    = '';

function loadProducts() {
  if (productUnsub) return; // already listening
  productUnsub = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), snap => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategoryFilters();
    renderProductsTable();
  });
}

function renderCategoryFilters() {
  const cats = ['all', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const bar  = document.getElementById('productCategoryFilters');
  bar.innerHTML = cats.map(c => `
    <button class="filter-btn${c === productCatFilter ? ' active' : ''}" data-cat="${c}">
      ${c === 'all' ? 'All' : c}
    </button>`).join('');
  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      productCatFilter = btn.dataset.cat;
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === productCatFilter));
      renderProductsTable();
    });
  });
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  let filtered = allProducts;
  if (productCatFilter !== 'all') filtered = filtered.filter(p => p.category === productCatFilter);
  if (productSearch) {
    const q = productSearch.toLowerCase();
    filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q));
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);">No products found</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(p => {
    const thumb = p.imageUrl
      ? `<img src="${p.imageUrl}" class="prod-thumb" alt="${p.name}" onerror="this.style.display='none'" />`
      : `<div class="prod-icon"><i class="${p.icon || 'fas fa-box'}"></i></div>`;
    const stockBadge = p.stock === 0 ? 'badge-out' : (p.stock <= (p.reorderLevel || 0) ? 'badge-low' : 'badge-instock');
    return `<tr>
      <td>${thumb}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '—'}</td>
      <td>${formatPrice(p.price)}</td>
      <td>
        <span class="stock-display" data-id="${p.id}" style="cursor:pointer;text-decoration:underline dotted;color:var(--gold);" title="Click to edit">${p.stock ?? 0}</span>
      </td>
      <td>${p.sold || 0}</td>
      <td>${p.clicks || 0}</td>
      <td>${p.whatsappClicks || 0}</td>
      <td><span class="badge ${p.active !== false ? 'badge-active' : 'badge-inactive'}">${p.active !== false ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          <button class="btn-outline btn-sm" onclick="openProductModal('${p.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-danger btn-sm" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Inline stock edit
  tbody.querySelectorAll('.stock-display').forEach(el => {
    el.addEventListener('click', function() {
      const id  = this.dataset.id;
      const cur = this.textContent;
      const cell = this.parentElement;
      cell.innerHTML = `<div class="inline-edit-wrap">
        <input type="number" class="inline-edit-input" value="${cur}" min="0" id="stockInput_${id}" />
        <button class="btn-gold btn-sm" id="stockSave_${id}"><i class="fas fa-check"></i></button>
      </div>`;
      document.getElementById(`stockSave_${id}`).addEventListener('click', async () => {
        const val = parseInt(document.getElementById(`stockInput_${id}`).value);
        if (isNaN(val) || val < 0) { showToast('Invalid stock value', 'error'); return; }
        try {
          await updateDoc(doc(db, 'products', id), { stock: val });
          showToast('Stock updated', 'success');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
      });
    });
  });
}

// Product search
document.getElementById('productSearch').addEventListener('input', function() {
  productSearch = this.value;
  renderProductsTable();
});

// Add product button
document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));

window.openProductModal = function(productId) {
  const p = productId ? allProducts.find(x => x.id === productId) : null;
  const title = p ? 'Edit Product' : 'Add Product';

  const bodyHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Product Name *</label>
        <input type="text" id="pName" value="${p?.name || ''}" placeholder="e.g. Vitamin C Serum" />
      </div>
      <div class="form-group">
        <label>Category *</label>
        <input type="text" id="pCategory" value="${p?.category || ''}" placeholder="e.g. Serums" list="catSuggestions" />
        <datalist id="catSuggestions">
          ${[...new Set(allProducts.map(x => x.category).filter(Boolean))].map(c => `<option value="${c}">`).join('')}
        </datalist>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Price (₦) *</label>
        <input type="number" id="pPrice" value="${p?.price || ''}" min="0" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Stock *</label>
        <input type="number" id="pStock" value="${p?.stock ?? 0}" min="0" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Reorder Level</label>
        <input type="number" id="pReorder" value="${p?.reorderLevel ?? 5}" min="0" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="pActive">
          <option value="true"  ${p?.active !== false ? 'selected' : ''}>Active</option>
          <option value="false" ${p?.active === false ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="pDesc" rows="3" placeholder="Short product description…">${p?.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Icon</label>
      <div class="icon-picker-wrap" id="productIconWrap">
        <input type="hidden" id="pIcon" value="${p?.icon || 'fas fa-box'}" />
        <button type="button" class="icon-picker-trigger" id="pIconTrigger"></button>
      </div>
    </div>
    <div class="form-group">
      <label>Product Image</label>
      <div class="image-upload-row">
        <div class="image-box">
          <label style="color:var(--text-muted);">Upload via Cloudinary</label>
          <button type="button" class="btn-outline btn-sm" id="cloudinaryUploadBtn"><i class="fas fa-cloud-arrow-up"></i> Upload Image</button>
          <div class="upload-progress" id="uploadProgress"><div class="upload-progress-fill" id="uploadProgressFill"></div></div>
        </div>
        <div class="image-box">
          <label style="color:var(--text-muted);">Or Paste URL</label>
          <input type="text" id="productImageUrl" placeholder="https://res.cloudinary.com/…" value="${p?.imageUrl || ''}" />
          <img id="imagePreview" src="${p?.imageUrl || ''}" style="${p?.imageUrl ? 'display:block;' : 'display:none;'}" />
        </div>
      </div>
    </div>`;

  const footerHTML = `
    <button class="btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn-gold" id="saveProductBtn"><i class="fas fa-save"></i> ${p ? 'Update' : 'Add'} Product</button>`;

  openModal(title, bodyHTML, footerHTML);

  // Build icon picker
  buildIconPicker('productIconWrap', 'pIcon', 'pIconTrigger');

  // Image URL preview
  document.getElementById('productImageUrl').addEventListener('input', function() {
    const preview = document.getElementById('imagePreview');
    if (this.value) { preview.src = this.value; preview.style.display = 'block'; }
    else preview.style.display = 'none';
  });

  // Cloudinary upload
  document.getElementById('cloudinaryUploadBtn').addEventListener('click', () => {
    openCloudinaryWidget(url => {
      document.getElementById('productImageUrl').value = url;
      const preview = document.getElementById('imagePreview');
      preview.src = url;
      preview.style.display = 'block';
      showToast('Image uploaded successfully', 'success');
    });
  });

  // Save
  document.getElementById('saveProductBtn').addEventListener('click', async () => {
    const name     = document.getElementById('pName').value.trim();
    const category = document.getElementById('pCategory').value.trim();
    const price    = parseFloat(document.getElementById('pPrice').value);
    const stock    = parseInt(document.getElementById('pStock').value);
    const reorder  = parseInt(document.getElementById('pReorder').value) || 0;
    const active   = document.getElementById('pActive').value === 'true';
    const desc     = document.getElementById('pDesc').value.trim();
    const icon     = document.getElementById('pIcon').value;
    const imageUrl = document.getElementById('productImageUrl').value.trim();

    if (!name) { showToast('Product name is required', 'error'); return; }
    if (!category) { showToast('Category is required', 'error'); return; }
    if (isNaN(price) || price < 0) { showToast('Valid price required', 'error'); return; }
    if (isNaN(stock) || stock < 0) { showToast('Valid stock required', 'error'); return; }

    const data = { name, category, price, stock, reorderLevel: reorder, active, description: desc, icon, imageUrl };

    try {
      if (p) {
        await updateDoc(doc(db, 'products', p.id), data);
        showToast('Product updated', 'success');
      } else {
        await addDoc(collection(db, 'products'), {
          ...data, clicks: 0, sold: 0, whatsappClicks: 0, createdAt: serverTimestamp()
        });
        showToast('Product added', 'success');
      }
      closeModal();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
};

window.deleteProduct = async function(id) {
  if (await confirmModal('Delete this product? This cannot be undone.')) {
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('Product deleted', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
};

sectionLoaders['products'] = loadProducts;

// ═══════════════════════════════════════════════════════════════════
//  SERVICES
// ═══════════════════════════════════════════════════════════════════
let allServices = [];
let serviceUnsub = null;

function loadServices() {
  if (serviceUnsub) return;
  serviceUnsub = onSnapshot(query(collection(db, 'services'), orderBy('order', 'asc')), snap => {
    allServices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderServicesTable();
  });
}

function renderServicesTable() {
  const tbody = document.getElementById('servicesTableBody');
  if (!allServices.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No services yet</td></tr>`;
    return;
  }
  tbody.innerHTML = allServices.map((s, i) => `
    <tr draggable="true" data-id="${s.id}" data-idx="${i}">
      <td><span class="drag-handle">☰</span></td>
      <td><i class="${s.icon || 'fas fa-spa'}" style="color:var(--gold);font-size:1.1rem;"></i></td>
      <td><strong>${s.name}</strong></td>
      <td style="color:var(--text-muted);font-size:0.82rem;">${(s.description || '').slice(0, 60)}${(s.description || '').length > 60 ? '…' : ''}</td>
      <td>${s.order ?? i}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${s.active !== false ? 'checked' : ''} data-id="${s.id}" class="svc-toggle" />
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn-outline btn-sm" onclick="openServiceModal('${s.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-danger btn-sm" onclick="deleteService('${s.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');

  // Toggle handlers
  tbody.querySelectorAll('.svc-toggle').forEach(cb => {
    cb.addEventListener('change', async function() {
      try {
        await updateDoc(doc(db, 'services', this.dataset.id), { active: this.checked });
        showToast('Service updated', 'success');
      } catch(e) { showToast('Error: ' + e.message, 'error'); }
    });
  });

  // Drag-to-reorder
  let dragSrc = null;
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('dragstart', function() { dragSrc = this; this.classList.add('dragging'); });
    row.addEventListener('dragend',   function() { this.classList.remove('dragging'); });
    row.addEventListener('dragover',  function(e) { e.preventDefault(); });
    row.addEventListener('drop', async function(e) {
      e.preventDefault();
      if (!dragSrc || dragSrc === this) return;
      const srcIdx = parseInt(dragSrc.dataset.idx);
      const tgtIdx = parseInt(this.dataset.idx);
      const moved  = allServices.splice(srcIdx, 1)[0];
      allServices.splice(tgtIdx, 0, moved);
      const batch = writeBatch(db);
      allServices.forEach((svc, idx) => {
        batch.update(doc(db, 'services', svc.id), { order: idx });
      });
      try {
        await batch.commit();
        showToast('Order updated', 'success');
      } catch(e) { showToast('Error: ' + e.message, 'error'); }
    });
  });
}

document.getElementById('addServiceBtn').addEventListener('click', () => openServiceModal(null));

window.openServiceModal = function(serviceId) {
  const s = serviceId ? allServices.find(x => x.id === serviceId) : null;

  const bodyHTML = `
    <div class="form-group">
      <label>Service Name *</label>
      <input type="text" id="sName" value="${s?.name || ''}" placeholder="e.g. Facial Treatment" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="sDesc" rows="3">${s?.description || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Icon</label>
        <div class="icon-picker-wrap" id="serviceIconWrap">
          <input type="hidden" id="sIcon" value="${s?.icon || 'fas fa-spa'}" />
          <button type="button" class="icon-picker-trigger" id="sIconTrigger"></button>
        </div>
      </div>
      <div class="form-group">
        <label>Order</label>
        <input type="number" id="sOrder" value="${s?.order ?? allServices.length}" min="0" />
      </div>
    </div>`;

  const footerHTML = `
    <button class="btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn-gold" id="saveServiceBtn"><i class="fas fa-save"></i> ${s ? 'Update' : 'Add'} Service</button>`;

  openModal(s ? 'Edit Service' : 'Add Service', bodyHTML, footerHTML);
  buildIconPicker('serviceIconWrap', 'sIcon', 'sIconTrigger');

  document.getElementById('saveServiceBtn').addEventListener('click', async () => {
    const name  = document.getElementById('sName').value.trim();
    const desc  = document.getElementById('sDesc').value.trim();
    const icon  = document.getElementById('sIcon').value;
    const order = parseInt(document.getElementById('sOrder').value) || 0;
    if (!name) { showToast('Service name is required', 'error'); return; }
    const data = { name, description: desc, icon, order, active: s?.active !== false };
    try {
      if (s) {
        await updateDoc(doc(db, 'services', s.id), data);
        showToast('Service updated', 'success');
      } else {
        await addDoc(collection(db, 'services'), { ...data, createdAt: serverTimestamp() });
        showToast('Service added', 'success');
      }
      closeModal();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
};

window.deleteService = async function(id) {
  if (await confirmModal('Delete this service?')) {
    try {
      await deleteDoc(doc(db, 'services', id));
      showToast('Service deleted', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
};

sectionLoaders['services'] = loadServices;

// ═══════════════════════════════════════════════════════════════════
//  APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════
let allAppointments = [];
let apptUnsub = null;
let apptStatusFilter = 'all';
let apptSearch       = '';
let prevApptCount    = -1;

function loadAppointments() {
  if (apptUnsub) return;
  apptUnsub = onSnapshot(query(collection(db, 'appointments'), orderBy('createdAt', 'desc')), snap => {
    // Notification for new appointments
    const notifyOn = localStorage.getItem('lk_notify_appointments') === 'true';
    if (notifyOn && prevApptCount !== -1 && snap.size > prevApptCount) {
      const newDoc = snap.docs[0].data();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Appointment', { body: `${newDoc.name} — ${newDoc.service}` });
      }
    }
    prevApptCount = snap.size;
    allAppointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAppointmentsTable();
  });
}

function getFilteredAppointments() {
  let filtered = allAppointments;
  if (apptStatusFilter !== 'all') filtered = filtered.filter(a => a.status === apptStatusFilter);
  if (apptSearch) {
    const q = apptSearch.toLowerCase();
    filtered = filtered.filter(a =>
      (a.name || '').toLowerCase().includes(q) || (a.phone || '').includes(q)
    );
  }
  return filtered;
}

function renderAppointmentsTable() {
  const tbody    = document.getElementById('appointmentsTableBody');
  const filtered = getFilteredAppointments();
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">No appointments found</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(a => `
    <tr>
      <td><code style="color:var(--gold);font-size:0.75rem;">${a.ref || '—'}</code></td>
      <td>${a.name || '—'}</td>
      <td>${a.phone || '—'}</td>
      <td>${a.service || '—'}</td>
      <td>${a.date || '—'}</td>
      <td>${a.time || '—'}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${(a.notes || '').slice(0, 40)}${(a.notes || '').length > 40 ? '…' : ''}</td>
      <td>
        <select class="status-select" data-id="${a.id}" onchange="updateApptStatus('${a.id}', this.value)">
          <option value="pending"   ${a.status === 'pending'   ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <div style="display:flex;gap:0.35rem;align-items:center;">
          <button class="btn-wa" onclick="sendApptWhatsApp('${a.id}')"><i class="fab fa-whatsapp"></i></button>
          <button class="btn-danger btn-sm" onclick="deleteAppointment('${a.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

window.updateApptStatus = async function(id, status) {
  try {
    await updateDoc(doc(db, 'appointments', id), { status });
    showToast('Status updated', 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
};

window.sendApptWhatsApp = function(id) {
  const a = allAppointments.find(x => x.id === id);
  if (!a) return;
  const msg = encodeURIComponent(
    `Hello ${a.name}, this is LA'KENZY confirming your appointment for ${a.service} on ${a.date} at ${a.time}. Your booking reference is ${a.ref}. We look forward to seeing you! ✦`
  );
  window.open(`https://wa.me/2348039239749?text=${msg}`, '_blank');
};

window.deleteAppointment = async function(id) {
  if (await confirmModal('Delete this appointment?')) {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      showToast('Appointment deleted', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
};

// Status filters
document.getElementById('apptStatusFilters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  apptStatusFilter = btn.dataset.status;
  document.querySelectorAll('#apptStatusFilters .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.status === apptStatusFilter));
  renderAppointmentsTable();
});

document.getElementById('apptSearch').addEventListener('input', function() {
  apptSearch = this.value;
  renderAppointmentsTable();
});

// Export appointments
document.getElementById('apptExportPdf').addEventListener('click', () => {
  const filtered = getFilteredAppointments();
  const cols = ['Ref', 'Name', 'Phone', 'Service', 'Date', 'Time', 'Status'];
  const rows = filtered.map(a => [a.ref || '', a.name || '', a.phone || '', a.service || '', a.date || '', a.time || '', a.status || '']);
  exportToPDF('Appointments Report', cols, rows, [`Total Records: ${filtered.length}`]);
});

document.getElementById('apptExportCsv').addEventListener('click', () => {
  const filtered = getFilteredAppointments();
  const cols = ['Ref', 'Name', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Notes', 'Created At'];
  const rows = filtered.map(a => [a.ref || '', a.name || '', a.phone || '', a.service || '', a.date || '', a.time || '', a.status || '', a.notes || '', formatDate(a.createdAt)]);
  exportToCSV(`lakenzy-appointments-${new Date().toISOString().slice(0,10)}.csv`, cols, rows);
});

sectionLoaders['appointments'] = loadAppointments;

// ═══════════════════════════════════════════════════════════════════
//  TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════
let allTestimonials = [];
let testimonialsUnsub = null;

function loadTestimonials() {
  if (testimonialsUnsub) return;
  testimonialsUnsub = onSnapshot(query(collection(db, 'testimonials'), orderBy('createdAt', 'desc')), snap => {
    allTestimonials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTestimonialsTable();
  });
}

function renderTestimonialsTable() {
  const tbody = document.getElementById('testimonialsTableBody');
  if (!allTestimonials.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No testimonials yet</td></tr>`;
    return;
  }
  tbody.innerHTML = allTestimonials.map(t => {
    const stars = Array(5).fill(0).map((_, i) =>
      `<span style="color:${i < (t.stars || 5) ? 'var(--gold)' : '#444'}">★</span>`).join('');
    return `<tr>
      <td><strong>${t.name || '—'}</strong></td>
      <td>${t.location || '—'}</td>
      <td>${stars}</td>
      <td style="color:var(--text-muted);font-size:0.82rem;">${(t.text || '').slice(0, 80)}${(t.text || '').length > 80 ? '…' : ''}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${t.active !== false ? 'checked' : ''} data-id="${t.id}" class="testi-toggle" />
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn-outline btn-sm" onclick="openTestimonialModal('${t.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-danger btn-sm" onclick="deleteTestimonial('${t.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.testi-toggle').forEach(cb => {
    cb.addEventListener('change', async function() {
      try {
        await updateDoc(doc(db, 'testimonials', this.dataset.id), { active: this.checked });
        showToast('Testimonial updated', 'success');
      } catch(e) { showToast('Error: ' + e.message, 'error'); }
    });
  });
}

document.getElementById('addTestimonialBtn').addEventListener('click', () => openTestimonialModal(null));

window.openTestimonialModal = function(testimonialId) {
  const t = testimonialId ? allTestimonials.find(x => x.id === testimonialId) : null;
  let starVal = t?.stars || 5;

  const bodyHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Name *</label>
        <input type="text" id="tName" value="${t?.name || ''}" placeholder="Customer name" />
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="tLocation" value="${t?.location || ''}" placeholder="e.g. Lagos, Nigeria" />
      </div>
    </div>
    <div class="form-group">
      <label>Rating</label>
      <div class="star-picker" id="starPicker">
        ${[1,2,3,4,5].map(i => `<span class="star${i <= starVal ? ' filled' : ''}" data-val="${i}">★</span>`).join('')}
      </div>
      <input type="hidden" id="tStars" value="${starVal}" />
    </div>
    <div class="form-group">
      <label>Testimonial Text *</label>
      <textarea id="tText" rows="4" placeholder="What the customer said…">${t?.text || ''}</textarea>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
        <input type="checkbox" id="tActive" ${t?.active !== false ? 'checked' : ''} style="width:auto;accent-color:var(--gold);" />
        Active (visible on website)
      </label>
    </div>`;

  const footerHTML = `
    <button class="btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn-gold" id="saveTestimonialBtn"><i class="fas fa-save"></i> ${t ? 'Update' : 'Add'}</button>`;

  openModal(t ? 'Edit Testimonial' : 'Add Testimonial', bodyHTML, footerHTML);

  // Star picker interaction
  const picker = document.getElementById('starPicker');
  picker.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
      starVal = parseInt(this.dataset.val);
      document.getElementById('tStars').value = starVal;
      picker.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('filled', i < starVal));
    });
    star.addEventListener('mouseenter', function() {
      const hv = parseInt(this.dataset.val);
      picker.querySelectorAll('.star').forEach((s, i) => s.style.color = i < hv ? 'var(--gold)' : '#444');
    });
    star.addEventListener('mouseleave', () => {
      picker.querySelectorAll('.star').forEach((s, i) => s.style.color = i < starVal ? 'var(--gold)' : '#444');
    });
  });

  document.getElementById('saveTestimonialBtn').addEventListener('click', async () => {
    const name   = document.getElementById('tName').value.trim();
    const loc    = document.getElementById('tLocation').value.trim();
    const stars  = parseInt(document.getElementById('tStars').value);
    const text   = document.getElementById('tText').value.trim();
    const active = document.getElementById('tActive').checked;
    if (!name) { showToast('Name is required', 'error'); return; }
    if (!text) { showToast('Testimonial text is required', 'error'); return; }
    const data = { name, location: loc, stars, text, active };
    try {
      if (t) {
        await updateDoc(doc(db, 'testimonials', t.id), data);
        showToast('Testimonial updated', 'success');
      } else {
        await addDoc(collection(db, 'testimonials'), { ...data, createdAt: serverTimestamp() });
        showToast('Testimonial added', 'success');
      }
      closeModal();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
};

window.deleteTestimonial = async function(id) {
  if (await confirmModal('Delete this testimonial?')) {
    try {
      await deleteDoc(doc(db, 'testimonials', id));
      showToast('Testimonial deleted', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
};

sectionLoaders['testimonials'] = loadTestimonials;

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════
let analyticsSortCol = 'clicks';
let analyticsSortAsc = false;
let analyticsFrom = null;
let analyticsTo   = null;

function loadAnalytics() {
  renderAnalyticsTables();
  loadAppointmentTrends();
}

function renderAnalyticsTables() {
  // Summary cards
  const totalClicks   = allProducts.reduce((s, p) => s + (p.clicks || 0), 0);
  const totalWa       = allProducts.reduce((s, p) => s + (p.whatsappClicks || 0), 0);
  const totalAppts    = allAppointments.length;
  const conversion    = totalClicks > 0 ? ((totalWa / totalClicks) * 100).toFixed(1) + '%' : '0%';

  document.getElementById('aTotalClicks').textContent  = totalClicks;
  document.getElementById('aTotalWa').textContent      = totalWa;
  document.getElementById('aTotalAppts').textContent   = totalAppts;
  document.getElementById('aConversion').textContent   = conversion;

  // Product performance table
  let prods = allProducts.map(p => ({
    name: p.name, category: p.category || '—',
    clicks: p.clicks || 0, whatsappClicks: p.whatsappClicks || 0,
    sold: p.sold || 0, revenue: (p.price || 0) * (p.sold || 0)
  }));

  prods.sort((a, b) => {
    const av = a[analyticsSortCol], bv = b[analyticsSortCol];
    if (typeof av === 'string') return analyticsSortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return analyticsSortAsc ? av - bv : bv - av;
  });

  const tbody = document.getElementById('analyticsProductBody');
  if (!prods.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No product data</td></tr>`;
  } else {
    const totals = prods.reduce((acc, p) => ({ clicks: acc.clicks + p.clicks, wa: acc.wa + p.whatsappClicks, sold: acc.sold + p.sold, rev: acc.rev + p.revenue }), { clicks: 0, wa: 0, sold: 0, rev: 0 });
    tbody.innerHTML = prods.map(p => `<tr>
      <td>${p.name}</td><td>${p.category}</td><td>${p.clicks}</td>
      <td>${p.whatsappClicks}</td><td>${p.sold}</td><td>${formatPrice(p.revenue)}</td>
    </tr>`).join('') +
    `<tr style="background:var(--gold-soft);font-weight:600;">
      <td colspan="2" style="color:var(--gold);">TOTALS</td>
      <td>${totals.clicks}</td><td>${totals.wa}</td><td>${totals.sold}</td><td>${formatPrice(totals.rev)}</td>
    </tr>`;
  }

  // Column sort headers
  document.querySelectorAll('#analyticsProductTable th.sortable').forEach(th => {
    th.addEventListener('click', function() {
      const col = this.dataset.col;
      if (analyticsSortCol === col) analyticsSortAsc = !analyticsSortAsc;
      else { analyticsSortCol = col; analyticsSortAsc = false; }
      renderAnalyticsTables();
    });
  });

  // Top 5 by clicks
  const topClicks = [...allProducts].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5);
  const maxClicks = Math.max(...topClicks.map(p => p.clicks || 0), 1);
  renderBarChartFromData('analyticsClicksChart', topClicks.map(p => ({
    label: p.name?.slice(0, 14) || '—',
    value: p.clicks || 0,
    pct: ((p.clicks || 0) / maxClicks * 100)
  })));

  // Top 5 by revenue
  const topRev = [...allProducts].sort((a, b) => ((b.price || 0) * (b.sold || 0)) - ((a.price || 0) * (a.sold || 0))).slice(0, 5);
  const maxRev = Math.max(...topRev.map(p => (p.price || 0) * (p.sold || 0)), 1);
  renderBarChartFromData('analyticsRevenueChart', topRev.map(p => {
    const rev = (p.price || 0) * (p.sold || 0);
    return { label: p.name?.slice(0, 14) || '—', value: formatPrice(rev), pct: (rev / maxRev * 100) };
  }));
}

function renderBarChartFromData(containerId, items) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = items.map(it => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${it.label}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${it.pct.toFixed(1)}%"></div></div>
      <div class="chart-bar-value">${it.value}</div>
    </div>`).join('');
}

async function loadAppointmentTrends() {
  const year = new Date().getFullYear();
  let apptQuery;
  if (analyticsFrom && analyticsTo) {
    const fromTs = Timestamp.fromDate(new Date(analyticsFrom));
    const toTs   = Timestamp.fromDate(new Date(analyticsTo + 'T23:59:59'));
    apptQuery = query(collection(db, 'appointments'), where('createdAt', '>=', fromTs), where('createdAt', '<=', toTs));
  } else {
    const start = Timestamp.fromDate(new Date(`${year}-01-01`));
    apptQuery   = query(collection(db, 'appointments'), where('createdAt', '>=', start));
  }
  try {
    const snap = await getDocs(apptQuery);
    const months = Array(12).fill(0);
    snap.forEach(d => {
      const ts = d.data().createdAt;
      if (!ts) return;
      const dt = ts.toDate ? ts.toDate() : new Date(ts);
      if (dt.getFullYear() === year || analyticsFrom) months[dt.getMonth()]++;
    });
    renderBarChart('analyticsApptChart', months, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);
  } catch(e) { /* silent */ }
}

document.getElementById('analyticsFilter').addEventListener('click', () => {
  analyticsFrom = document.getElementById('analyticsFrom').value || null;
  analyticsTo   = document.getElementById('analyticsTo').value   || null;
  loadAppointmentTrends();
});

sectionLoaders['analytics'] = loadAnalytics;

// ═══════════════════════════════════════════════════════════════════
//  INVENTORY
// ═══════════════════════════════════════════════════════════════════
let stockLogsUnsub = null;

function loadInventory() {
  renderInventoryTable();
  if (!stockLogsUnsub) {
    stockLogsUnsub = onSnapshot(query(collection(db, 'stockLogs'), orderBy('timestamp', 'desc')), snap => {
      renderStockLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  const banner = document.getElementById('inventoryAlertBanner');

  const lowItems = allProducts.filter(p => (p.stock || 0) === 0 || (p.stock || 0) <= (p.reorderLevel || 0));
  if (lowItems.length) {
    banner.style.display = 'flex';
    banner.innerHTML = `<i class="fas fa-triangle-exclamation"></i>
      <div><strong>Low Stock Alert:</strong> ${lowItems.map(p => p.name).join(', ')}</div>`;
  } else {
    banner.style.display = 'none';
  }

  if (!allProducts.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">No products</td></tr>`;
    return;
  }

  tbody.innerHTML = allProducts.map(p => {
    const stockBadge = p.stock === 0 ? '<span class="badge badge-out">Out of Stock</span>'
      : p.stock <= (p.reorderLevel || 0) ? '<span class="badge badge-low">Low Stock</span>'
      : '<span class="badge badge-instock">In Stock</span>';
    return `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '—'}</td>
      <td>${formatPrice(p.price)}</td>
      <td>${p.stock ?? 0}</td>
      <td>${p.sold || 0}</td>
      <td>
        <span class="reorder-display" data-id="${p.id}" style="cursor:pointer;text-decoration:underline dotted;color:var(--gold);" title="Click to edit">${p.reorderLevel ?? 0}</span>
      </td>
      <td>${stockBadge}</td>
      <td>
        <button class="btn-gold btn-sm" onclick="openRestockModal('${p.id}')"><i class="fas fa-plus"></i> Restock</button>
      </td>
    </tr>`;
  }).join('');

  // Inline reorder level edit
  tbody.querySelectorAll('.reorder-display').forEach(el => {
    el.addEventListener('click', function() {
      const id  = this.dataset.id;
      const cur = this.textContent;
      const cell = this.parentElement;
      cell.innerHTML = `<div class="inline-edit-wrap">
        <input type="number" class="inline-edit-input" value="${cur}" min="0" id="reorderInput_${id}" />
        <button class="btn-gold btn-sm" id="reorderSave_${id}"><i class="fas fa-check"></i></button>
      </div>`;
      document.getElementById(`reorderSave_${id}`).addEventListener('click', async () => {
        const val = parseInt(document.getElementById(`reorderInput_${id}`).value);
        if (isNaN(val) || val < 0) { showToast('Invalid value', 'error'); return; }
        try {
          await updateDoc(doc(db, 'products', id), { reorderLevel: val });
          showToast('Reorder level updated', 'success');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
      });
    });
  });
}

function renderStockLogs(logs) {
  const tbody = document.getElementById('stockLogsBody');
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No stock logs yet</td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => `<tr>
    <td>${l.productName || '—'}</td>
    <td style="color:var(--success);">+${l.quantityAdded}</td>
    <td>${l.newStock}</td>
    <td style="color:var(--text-muted);">${l.adminNote || '—'}</td>
    <td style="color:var(--text-muted);font-size:0.8rem;">${formatDate(l.timestamp)}</td>
  </tr>`).join('');
}

window.openRestockModal = function(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;

  const bodyHTML = `
    <div class="form-group">
      <label>Product</label>
      <input type="text" value="${p.name}" readonly style="color:var(--text-muted);" />
    </div>
    <p style="color:var(--text-muted);font-size:0.83rem;margin-bottom:1rem;">Current Stock: <strong style="color:var(--gold);">${p.stock ?? 0}</strong></p>
    <div class="form-group">
      <label>Quantity to Add *</label>
      <input type="number" id="restockQty" min="1" placeholder="e.g. 20" />
    </div>
    <div class="form-group">
      <label>Admin Note</label>
      <textarea id="restockNote" rows="2" placeholder="e.g. Received from supplier…"></textarea>
    </div>`;

  const footerHTML = `
    <button class="btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn-gold" id="restockSaveBtn"><i class="fas fa-plus"></i> Add Stock</button>`;

  openModal(`Restock: ${p.name}`, bodyHTML, footerHTML);

  document.getElementById('restockSaveBtn').addEventListener('click', async () => {
    const qty  = parseInt(document.getElementById('restockQty').value);
    const note = document.getElementById('restockNote').value.trim();
    if (isNaN(qty) || qty < 1) { showToast('Enter a valid quantity', 'error'); return; }
    const newStock = (p.stock || 0) + qty;
    try {
      await updateDoc(doc(db, 'products', p.id), { stock: newStock });
      await addDoc(collection(db, 'stockLogs'), {
        productId: p.id, productName: p.name,
        quantityAdded: qty, newStock, adminNote: note,
        timestamp: serverTimestamp()
      });
      showToast(`Stock updated: ${p.name} → ${newStock}`, 'success');
      closeModal();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
};

// Inventory exports
document.getElementById('invExportPdf').addEventListener('click', () => {
  const cols = ['Name', 'Category', 'Price', 'Stock', 'Sold', 'Reorder Level', 'Status'];
  const rows = allProducts.map(p => [
    p.name, p.category || '', formatPrice(p.price), p.stock ?? 0, p.sold || 0, p.reorderLevel ?? 0,
    p.stock === 0 ? 'Out of Stock' : p.stock <= (p.reorderLevel || 0) ? 'Low Stock' : 'In Stock'
  ]);
  exportToPDF('Inventory Report', cols, rows, [`Total Products: ${allProducts.length}`, `Low Stock Items: ${allProducts.filter(p => p.stock <= (p.reorderLevel || 0)).length}`], 'landscape');
});

document.getElementById('invExportCsv').addEventListener('click', () => {
  const cols = ['Name', 'Category', 'Price', 'Stock', 'Sold', 'Reorder Level', 'Status'];
  const rows = allProducts.map(p => [
    p.name, p.category || '', p.price || 0, p.stock ?? 0, p.sold || 0, p.reorderLevel ?? 0,
    p.stock === 0 ? 'Out of Stock' : p.stock <= (p.reorderLevel || 0) ? 'Low Stock' : 'In Stock'
  ]);
  exportToCSV(`lakenzy-inventory-${new Date().toISOString().slice(0,10)}.csv`, cols, rows);
});

sectionLoaders['inventory'] = loadInventory;

// ═══════════════════════════════════════════════════════════════════
//  SALES RECORDS
// ═══════════════════════════════════════════════════════════════════
let allSales = [];
let salesUnsub = null;
let salesFromFilter    = '';
let salesToFilter      = '';
let salesProductFilter = '';

function loadSales() {
  // Populate product filter dropdown
  const sel = document.getElementById('salesProductFilter');
  sel.innerHTML = '<option value="">All Products</option>' +
    allProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  if (salesUnsub) return;
  salesUnsub = onSnapshot(query(collection(db, 'salesRecords'), orderBy('date', 'desc')), snap => {
    allSales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSalesTable();
  });
}

function getFilteredSales() {
  let filtered = allSales;
  if (salesFromFilter) filtered = filtered.filter(s => s.date >= salesFromFilter);
  if (salesToFilter)   filtered = filtered.filter(s => s.date <= salesToFilter);
  if (salesProductFilter) filtered = filtered.filter(s => s.productId === salesProductFilter);
  return filtered;
}

function renderSalesTable() {
  const tbody    = document.getElementById('salesTableBody');
  const filtered = getFilteredSales();

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);">No sales records</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(s => `<tr>
      <td style="font-size:0.8rem;color:var(--text-muted);">${s.date || '—'}</td>
      <td>${s.productName || '—'}</td>
      <td>${s.category || '—'}</td>
      <td>${s.quantity}</td>
      <td>${formatPrice(s.unitPrice)}</td>
      <td style="color:var(--gold);font-weight:600;">${formatPrice(s.totalAmount)}</td>
      <td>${s.customerName || '—'}</td>
      <td>${s.customerPhone || '—'}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${(s.notes || '').slice(0, 30)}${(s.notes || '').length > 30 ? '…' : ''}</td>
      <td>
        <button class="btn-danger btn-sm" onclick="deleteSale('${s.id}', '${s.productId}', ${s.quantity})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
  }

  // Summary bar
  const totalRev   = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalUnits = filtered.reduce((s, r) => s + (r.quantity || 0), 0);
  document.getElementById('salesTotalRevenue').textContent = `Total Revenue: ${formatPrice(totalRev)}`;
  document.getElementById('salesTotalUnits').textContent   = `Total Units Sold: ${totalUnits}`;
  document.getElementById('salesTotalTxns').textContent    = `Total Transactions: ${filtered.length}`;
}

// Filter events
document.getElementById('salesFrom').addEventListener('change', function() { salesFromFilter = this.value; renderSalesTable(); });
document.getElementById('salesTo').addEventListener('change', function() { salesToFilter = this.value; renderSalesTable(); });
document.getElementById('salesProductFilter').addEventListener('change', function() { salesProductFilter = this.value; renderSalesTable(); });

// Add sale
document.getElementById('addSaleBtn').addEventListener('click', () => {
  const bodyHTML = `
    <div class="form-group">
      <label>Product *</label>
      <select id="saleProduct" onchange="onSaleProductChange()">
        <option value="">-- Select Product --</option>
        ${allProducts.map(p => `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}" data-cat="${p.category || ''}">${p.name} (Stock: ${p.stock ?? 0})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Unit Price (₦)</label>
        <input type="number" id="saleUnitPrice" readonly placeholder="Auto-filled" />
      </div>
      <div class="form-group">
        <label>Quantity *</label>
        <input type="number" id="saleQty" min="1" value="1" />
        <p class="hint-text" id="saleStockHint"></p>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Customer Name</label>
        <input type="text" id="saleCustName" placeholder="Optional" />
      </div>
      <div class="form-group">
        <label>Customer Phone</label>
        <input type="text" id="saleCustPhone" placeholder="Optional" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Date *</label>
        <input type="date" id="saleDate" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input type="text" id="saleNotes" placeholder="Optional notes" />
      </div>
    </div>`;

  const footerHTML = `
    <button class="btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn-gold" id="saveSaleBtn"><i class="fas fa-receipt"></i> Record Sale</button>`;

  openModal('Record Sale', bodyHTML, footerHTML);

  document.getElementById('saveSaleBtn').addEventListener('click', async () => {
    const sel       = document.getElementById('saleProduct');
    const productId = sel.value;
    const qty       = parseInt(document.getElementById('saleQty').value);
    const date      = document.getElementById('saleDate').value;

    if (!productId) { showToast('Select a product', 'error'); return; }
    if (isNaN(qty) || qty < 1) { showToast('Quantity must be ≥ 1', 'error'); return; }
    if (!date) { showToast('Date is required', 'error'); return; }

    const product = allProducts.find(p => p.id === productId);
    if (!product) { showToast('Product not found', 'error'); return; }
    if (qty > (product.stock || 0)) { showToast(`Only ${product.stock || 0} in stock`, 'error'); return; }

    const unitPrice   = product.price || 0;
    const totalAmount = unitPrice * qty;
    const newStock    = (product.stock || 0) - qty;
    const newSold     = (product.sold || 0) + qty;

    const data = {
      productId, productName: product.name, category: product.category || '',
      quantity: qty, unitPrice, totalAmount,
      customerName:  document.getElementById('saleCustName').value.trim(),
      customerPhone: document.getElementById('saleCustPhone').value.trim(),
      notes:         document.getElementById('saleNotes').value.trim(),
      date, createdAt: serverTimestamp()
    };

    try {
      const batch = writeBatch(db);
      const saleRef = doc(collection(db, 'salesRecords'));
      batch.set(saleRef, data);
      batch.update(doc(db, 'products', productId), { stock: newStock, sold: newSold });
      await batch.commit();
      showToast('Sale recorded successfully', 'success');
      closeModal();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
});

window.onSaleProductChange = function() {
  const sel = document.getElementById('saleProduct');
  const opt = sel.options[sel.selectedIndex];
  const price = opt.dataset.price || '';
  const stock = opt.dataset.stock || '';
  document.getElementById('saleUnitPrice').value = price;
  document.getElementById('saleStockHint').textContent = stock ? `Available: ${stock}` : '';
  document.getElementById('saleQty').max = stock || '';
};

window.deleteSale = async function(id) {
  if (await confirmModal('Delete this sale record?')) {
    try {
      await deleteDoc(doc(db, 'salesRecords', id));
      showToast('Sale deleted', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
};

// Export sales
document.getElementById('salesExportPdf').addEventListener('click', () => {
  const filtered   = getFilteredSales();
  const totalRev   = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalUnits = filtered.reduce((s, r) => s + (r.quantity || 0), 0);
  const cols = ['Date', 'Product', 'Qty', 'Unit Price', 'Total', 'Customer'];
  const rows = filtered.map(s => [s.date || '', s.productName || '', s.quantity, formatPrice(s.unitPrice), formatPrice(s.totalAmount), s.customerName || '']);
  exportToPDF('Sales Report', cols, rows, [
    `Total Revenue: ${formatPrice(totalRev)}`,
    `Total Units Sold: ${totalUnits}`,
    `Total Transactions: ${filtered.length}`
  ], 'landscape');
});

document.getElementById('salesExportCsv').addEventListener('click', () => {
  const filtered = getFilteredSales();
  const cols = ['Date', 'Product', 'Category', 'Qty', 'Unit Price', 'Total', 'Customer Name', 'Customer Phone', 'Notes'];
  const rows = filtered.map(s => [s.date || '', s.productName || '', s.category || '', s.quantity, s.unitPrice, s.totalAmount, s.customerName || '', s.customerPhone || '', s.notes || '']);
  exportToCSV(`lakenzy-sales-${new Date().toISOString().slice(0,10)}.csv`, cols, rows);
});

sectionLoaders['sales'] = loadSales;

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════
async function loadSettings() {
  const user = auth.currentUser;
  if (user) {
    document.getElementById('settingsEmail').textContent = user.email;
  }

  // Business Info
  try {
    const snap = await getDoc(doc(db, 'settings', 'businessInfo'));
    if (snap.exists()) {
      const d = snap.data();
      document.getElementById('bizName').value      = d.businessName || '';
      document.getElementById('bizTagline').value   = d.tagline      || '';
      document.getElementById('bizAddress').value   = d.address      || '';
      document.getElementById('bizPhone1').value    = d.phone1       || '';
      document.getElementById('bizPhone2').value    = d.phone2       || '';
      document.getElementById('bizWhatsapp').value  = d.whatsapp     || '';
      document.getElementById('bizInstagram').value = d.instagram    || '';
      document.getElementById('bizWebsite').value   = d.website      || '';
    }
  } catch(e) { /* silent */ }

  // Cloudinary Config
  try {
    const snap = await getDoc(doc(db, 'settings', 'cloudinaryConfig'));
    if (snap.exists()) {
      document.getElementById('cloudName').value    = snap.data().cloudName    || '';
      document.getElementById('uploadPreset').value = snap.data().uploadPreset || '';
    }
  } catch(e) { /* silent */ }

  // Notification checkbox
  document.getElementById('notifyAppointments').checked = localStorage.getItem('lk_notify_appointments') === 'true';

  // Live doc counts
  try {
    const cols = ['products', 'appointments', 'salesRecords', 'services', 'testimonials', 'stockLogs'];
    const ids  = ['countProducts', 'countAppointments', 'countSales', 'countServices', 'countTestimonials', 'countLogs'];
    await Promise.all(cols.map(async (c, i) => {
      const snap = await getCountFromServer(collection(db, c));
      document.getElementById(ids[i]).textContent = snap.data().count;
    }));
  } catch(e) { /* silent */ }
}

// Change password
document.getElementById('changePasswordBtn').addEventListener('click', async () => {
  const curPass  = document.getElementById('currentPassword').value;
  const newPass  = document.getElementById('newPassword').value;
  const confPass = document.getElementById('confirmPassword').value;
  if (!curPass || !newPass || !confPass) { showToast('Fill all password fields', 'error'); return; }
  if (newPass !== confPass) { showToast('New passwords do not match', 'error'); return; }
  if (newPass.length < 6)  { showToast('Password must be at least 6 characters', 'error'); return; }
  try {
    const user       = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, curPass);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPass);
    showToast('Password updated successfully', 'success');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value     = '';
    document.getElementById('confirmPassword').value = '';
  } catch(e) { showToast('Error: ' + (e.code === 'auth/wrong-password' ? 'Current password incorrect' : e.message), 'error'); }
});

// Save business info
document.getElementById('saveBizInfoBtn').addEventListener('click', async () => {
  const data = {
    businessName: document.getElementById('bizName').value.trim(),
    tagline:      document.getElementById('bizTagline').value.trim(),
    address:      document.getElementById('bizAddress').value.trim(),
    phone1:       document.getElementById('bizPhone1').value.trim(),
    phone2:       document.getElementById('bizPhone2').value.trim(),
    whatsapp:     document.getElementById('bizWhatsapp').value.trim(),
    instagram:    document.getElementById('bizInstagram').value.trim(),
    website:      document.getElementById('bizWebsite').value.trim()
  };
  try {
    await setDoc(doc(db, 'settings', 'businessInfo'), data, { merge: true });
    showToast('Business info saved', 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
});

// Save Cloudinary config
document.getElementById('saveCloudinaryBtn').addEventListener('click', async () => {
  const cloudName    = document.getElementById('cloudName').value.trim();
  const uploadPreset = document.getElementById('uploadPreset').value.trim();
  if (!cloudName || !uploadPreset) { showToast('Enter Cloud Name and Upload Preset', 'error'); return; }
  try {
    await setDoc(doc(db, 'settings', 'cloudinaryConfig'), { cloudName, uploadPreset }, { merge: true });
    cloudinaryConfig = { cloudName, uploadPreset };
    showToast('Cloudinary config saved', 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
});

// Notifications checkbox
document.getElementById('notifyAppointments').addEventListener('change', async function() {
  if (this.checked) {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      showToast('Browser notifications not granted', 'warning');
      this.checked = false;
      return;
    }
    localStorage.setItem('lk_notify_appointments', 'true');
    showToast('Appointment notifications enabled', 'success');
  } else {
    localStorage.removeItem('lk_notify_appointments');
    showToast('Appointment notifications disabled', 'info');
  }
});

// Clear demo data
document.getElementById('clearDemoBtn').addEventListener('click', async () => {
  if (await confirmModal('This will delete demo products (IDs starting with "p"). Continue?')) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach(d => {
        if (d.id.startsWith('p')) { batch.delete(d.ref); count++; }
      });
      await batch.commit();
      showToast(`Cleared ${count} demo product(s)`, 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  }
});

sectionLoaders['settings'] = loadSettings;

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
async function initApp() {
  await loadCloudinaryConfig();

  // Start products listener immediately (needed by analytics, inventory, sales)
  loadProducts();

  // Show dashboard by default
  showSection('dashboard');
}
