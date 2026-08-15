/* global fetch, document, window, alert, confirm, FileReader, location */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentMonth = new Date();
let allBookings = [];
let allClients = [];

async function api(path, method = 'GET', body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function fillClientSelects() {
  const html = allClients.map(c => `<option value="${c.id}">${c.name} — ${c.dog_name}</option>`).join('');
  ['#booking-client', '#invoice-client', '#receipt-client', '#media-client'].forEach(id => {
    const el = $(id); if (el) el.innerHTML = `<option value="">Choose client</option>` + html;
  });
}

async function loadClients() {
  const data = await api('/api/admin/clients');
  allClients = data.clients || [];
  fillClientSelects();
  $('#clients-table').innerHTML = `<tr><th>Name</th><th>Dog</th><th>Email</th><th>Phone</th><th></th></tr>` +
    allClients.map(c => `<tr data-id="${c.id}">
      <td>${c.name}</td><td>${c.dog_name || '-'}</td><td>${c.email}</td><td>${c.phone || '-'}</td>
      <td><button class="btn btn-outline" onclick="deleteClient('${c.id}')" style="padding:.3rem .7rem;font-size:.8rem">Delete</button></td>
    </tr>`).join('');
}

async function loadBookings() {
  const data = await api('/api/admin/bookings');
  allBookings = data.bookings || [];
  renderCalendar();
  $('#bookings-table').innerHTML = `<tr><th>Client</th><th>Dog</th><th>Date</th><th>Time</th><th>Service</th><th></th></tr>` +
    allBookings.map(b => `<tr data-id="${b.id}">
      <td>${b.client_name}</td><td>${b.dog_name || '-'}</td><td>${b.booking_date}</td>
      <td>${b.start_time ? b.start_time.slice(0,5) : ''}${b.end_time ? '–' + b.end_time.slice(0,5) : ''}</td>
      <td>${b.service}</td>
      <td><button class="btn btn-outline" onclick="deleteBooking('${b.id}')" style="padding:.3rem .7rem;font-size:.8rem">Delete</button></td>
    </tr>`).join('');
}

async function loadInvoices() {
  const data = await api('/api/admin/invoices');
  $('#invoices-table').innerHTML = `<tr><th>Client</th><th>Amount</th><th>Description</th><th>Status</th><th></th></tr>` +
    (data.invoices || []).map(i => `<tr data-id="${i.id}">
      <td>${i.client_name}</td><td>£${Number(i.amount).toFixed(2)}</td><td>${i.description || '-'}</td>
      <td><span class="status ${i.status}">${i.status}</span></td>
      <td><button class="btn btn-outline" onclick="deleteInvoice('${i.id}')" style="padding:.3rem .7rem;font-size:.8rem">Delete</button></td>
    </tr>`).join('');
}

async function loadReceipts() {
  const data = await api('/api/admin/receipts');
  $('#receipts-table').innerHTML = `<tr><th>Client</th><th>Amount</th><th>Date</th><th></th></tr>` +
    (data.receipts || []).map(r => `<tr data-id="${r.id}">
      <td>${r.client_name}</td><td>£${Number(r.amount).toFixed(2)}</td><td>${new Date(r.created_at).toLocaleDateString('en-GB')}</td>
      <td><button class="btn btn-outline" onclick="deleteReceipt('${r.id}')" style="padding:.3rem .7rem;font-size:.8rem">Delete</button></td>
    </tr>`).join('');
}

async function loadMedia() {
  const data = await api('/api/admin/media');
  $('#media-table').innerHTML = `<tr><th>Client</th><th>File</th><th>Caption</th><th>Date</th><th></th></tr>` +
    (data.media || []).map(m => `<tr data-id="${m.id}">
      <td>${m.client_name}</td><td>${m.filename}</td><td>${m.caption || '-'}</td><td>${new Date(m.created_at).toLocaleDateString('en-GB')}</td>
      <td><button class="btn btn-outline" onclick="deleteMedia('${m.id}')" style="padding:.3rem .7rem;font-size:.8rem">Delete</button></td>
    </tr>`).join('');
}

function renderCalendar() {
  const grid = $('#calendar-grid');
  grid.innerHTML = '';
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  $('#cal-month').textContent = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const total = last.getDate();

  for (let i = 0; i < startDay; i++) {
    const prevLast = new Date(year, month, 0).getDate();
    const d = prevLast - startDay + i + 1;
    grid.innerHTML += `<div class="cal-cell other"><div class="day">${d}</div></div>`;
  }

  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayBookings = allBookings.filter(b => b.booking_date === dateStr);
    const dots = dayBookings.map(() => '<span class="cal-dot"></span>').join('');
    grid.innerHTML += `<div class="cal-cell" data-date="${dateStr}" onclick="openDay('${dateStr}')">
      <div class="day">${d}</div>
      <div>${dots}</div>
    </div>`;
  }
}

function openDay(date) {
  const dayBookings = allBookings.filter(b => b.booking_date === date);
  const content = dayBookings.length ? dayBookings.map(b => `
    <div style="border-bottom:1px solid #eee;padding:.7rem 0">
      <strong>${b.client_name}</strong> — ${b.dog_name || 'no dog'}<br>
      <span style="font-size:.85rem;color:#666">${b.start_time ? b.start_time.slice(0,5) : ''} ${b.service} · ${b.status}</span>
    </div>
  `).join('') : '<p class="empty">No bookings on this day.</p>';
  $('#day-title').textContent = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#day-content').innerHTML = content;
  $('#day-popup').classList.add('active');
}

window.deleteClient = async (id) => { if (!confirm('Delete this client?')) return; await api('/api/admin/clients', 'DELETE', { id }); loadClients(); };
window.deleteBooking = async (id) => { if (!confirm('Delete this booking?')) return; await api('/api/admin/bookings', 'DELETE', { id }); loadBookings(); };
window.deleteInvoice = async (id) => { if (!confirm('Delete this invoice?')) return; await api('/api/admin/invoices', 'DELETE', { id }); loadInvoices(); };
window.deleteReceipt = async (id) => { if (!confirm('Delete this receipt?')) return; await api('/api/admin/receipts', 'DELETE', { id }); loadReceipts(); };
window.deleteMedia = async (id) => { if (!confirm('Delete this media?')) return; await api('/api/admin/media', 'DELETE', { id }); loadMedia(); };

async function init() {
  const me = await fetch('/api/auth/me', { credentials: 'include' });
  if (!me.ok) return location.href = '/login.html#admin';
  const { user } = await me.json();
  if (user.role !== 'admin') return location.href = '/portal.html';

  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#${btn.dataset.tab}`).classList.add('active');
    });
  });

  $('#prev-month').addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); });
  $('#next-month').addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); });

  $('#client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    await api('/api/admin/clients', 'POST', body);
    e.target.reset();
    loadClients();
  });

  $('#booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    await api('/api/admin/bookings', 'POST', body);
    e.target.reset();
    loadBookings();
  });

  $('#invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    await api('/api/admin/invoices', 'POST', body);
    e.target.reset();
    loadInvoices();
  });

  $('#receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    await api('/api/admin/receipts', 'POST', body);
    e.target.reset();
    loadReceipts();
    loadInvoices();
  });

  const files = [];
  const fileInput = $('#media-files');
  fileInput.addEventListener('change', async (e) => {
    for (const f of e.target.files) {
      const data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(f);
      });
      files.push({ name: f.name, data, contentType: f.type, type: f.type.startsWith('video') ? 'video' : 'image' });
    }
    $('#dropzone div').textContent = `${files.length} file(s) selected`;
  });

  $('#media-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    await api('/api/admin/media', 'POST', { client_id: body.client_id, caption: body.caption, files });
    e.target.reset();
    files.length = 0;
    $('#dropzone div').textContent = 'Click or drag images & videos here';
    loadMedia();
  });

  await Promise.all([loadClients(), loadBookings(), loadInvoices(), loadReceipts(), loadMedia()]);
}

init().catch(err => { console.error(err); alert('Admin load error: ' + err.message); });
