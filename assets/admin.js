/* global fetch, document, window, alert, confirm, FileReader, location, Promise */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentMonth = new Date();
let allBookings = [];
let allClients = [];
let allInvoices = [];

const SERVICE_LABELS = { walk: 'Dog walking', daycare: 'Day care', feeding: 'Feeding / home visit', combined: 'Combined day care & walk' };

function toDateStr(val) {
  if (!val) return '';
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try { return new Date(val).toISOString().slice(0, 10); } catch { return s; }
}

async function api(path, method = 'GET', body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function dogLabel(c) {
  const parts = [c.dog_name, c.dog_breed].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

function fillClientSelects() {
  const html = allClients.map(c => `<option value="${c.id}">${c.name}${c.dog_name ? ' (' + c.dog_name + ')' : ''}</option>`).join('');
  ['#booking-client', '#invoice-client', '#receipt-client', '#media-client', '#qb-client'].forEach(id => {
    const el = $(id); if (el) el.innerHTML = '<option value="">Choose client…</option>' + html;
  });
}

function updateOverview() {
  const todayStr = toDateStr(new Date());
  const weekEnd = toDateStr(new Date(Date.now() + 7 * 86400000));
  const todayCount = allBookings.filter(b => b.booking_date === todayStr).length;
  const weekCount = allBookings.filter(b => b.booking_date >= todayStr && b.booking_date <= weekEnd).length;
  const unpaidTotal = allInvoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + Number(i.amount), 0);
  $('#stat-clients').textContent = allClients.length;
  $('#stat-today').textContent = todayCount;
  $('#stat-week').textContent = weekCount;
  $('#stat-unpaid').textContent = '£' + unpaidTotal.toFixed(2);

  const upcoming = allBookings
    .filter(b => b.booking_date >= todayStr && b.booking_date <= weekEnd && b.status !== 'cancelled')
    .sort((a, b) => a.booking_date.localeCompare(b.booking_date));
  $('#upcoming-list').innerHTML = upcoming.length
    ? upcoming.map(b => `<div class="upcoming-row">
        <div>
          <strong>${b.client_name}</strong>${b.dog_name ? ' &amp; ' + b.dog_name : ''} &mdash; <span style="color:var(--teal-dark)">${SERVICE_LABELS[b.service] || b.service}</span>
          ${b.notes ? `<br><span style="font-size:.82rem;color:#888">${b.notes}</span>` : ''}
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-weight:700;color:var(--teal-dark)">${new Date(b.booking_date + 'T00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}</div>
          <div style="font-size:.82rem;color:#888">${b.start_time ? b.start_time.slice(0,5) : ''}</div>
          <span class="badge ${b.status}">${b.status}</span>
        </div>
      </div>`).join('')
    : '<p style="color:#aaa;font-size:.9rem">No bookings in the next 7 days.</p>';
}

async function loadClients() {
  const data = await api('/api/admin/clients');
  allClients = data.clients || [];
  fillClientSelects();
  const tbody = allClients.map(c => `<tr>
    <td><strong>${c.name}</strong>${c.notes ? '<br><span style="font-size:.78rem;color:#888">' + c.notes + '</span>' : ''}</td>
    <td>${c.dog_name || '—'}</td>
    <td>${c.dog_breed || '—'}</td>
    <td>${c.email}</td>
    <td>${c.phone || '—'}</td>
    <td class="act">
      <button class="btn btn-outline btn-sm" onclick="editClient('${c.id}')">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteClient('${c.id}')">Delete</button>
    </td>
  </tr>`).join('');
  $('#clients-table').innerHTML = '<tr><th>Name</th><th>Dog</th><th>Breed</th><th>Email</th><th>Phone</th><th>Actions</th></tr>' + tbody;
}

async function loadBookings() {
  const data = await api('/api/admin/bookings');
  allBookings = (data.bookings || []).map(b => ({ ...b, booking_date: toDateStr(b.booking_date) }));
  renderCalendar();
  updateOverview();
  const tbody = allBookings.map(b => `<tr>
    <td>${b.client_name}</td>
    <td>${b.dog_name || '—'}</td>
    <td>${new Date(b.booking_date + 'T00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
    <td style="white-space:nowrap">${b.start_time ? b.start_time.slice(0,5) : ''}${b.end_time ? '–' + b.end_time.slice(0,5) : ''}</td>
    <td>${SERVICE_LABELS[b.service] || b.service}</td>
    <td><span class="badge ${b.status}">${b.status}</span></td>
    <td style="font-size:.82rem;color:#888;max-width:160px">${b.notes || '—'}</td>
    <td class="act">
      ${b.status !== 'completed' ? `<button class="btn btn-sm btn-success" onclick="setBookingStatus('${b.id}','completed',this)">✓ Done</button>` : ''}
      ${b.status === 'confirmed' ? `<button class="btn btn-sm btn-warn" onclick="setBookingStatus('${b.id}','cancelled',this)">✕ Cancel</button>` : ''}
      <button class="btn btn-sm btn-danger" onclick="deleteBooking('${b.id}')">Delete</button>
    </td>
  </tr>`).join('');
  $('#bookings-table').innerHTML = '<tr><th>Client</th><th>Dog</th><th>Date</th><th>Time</th><th>Service</th><th>Status</th><th>Notes</th><th>Actions</th></tr>' + tbody;
}

async function loadInvoices() {
  const data = await api('/api/admin/invoices');
  allInvoices = data.invoices || [];
  updateOverview();
  const unpaidTotal = allInvoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + Number(i.amount), 0);
  const paidTotal = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
  $('#invoices-summary').innerHTML = `<span style="color:#c33">Unpaid: £${unpaidTotal.toFixed(2)}</span> &nbsp;·&nbsp; <span style="color:#2d5a27">Paid: £${paidTotal.toFixed(2)}</span>`;
  const tbody = allInvoices.map(i => `<tr>
    <td>${i.client_name}</td>
    <td><strong>£${Number(i.amount).toFixed(2)}</strong></td>
    <td>${i.description || '—'}</td>
    <td>${i.due_date ? new Date(toDateStr(i.due_date) + 'T00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—'}</td>
    <td><span class="badge ${i.status}">${i.status}</span></td>
    <td class="act">
      ${i.status === 'unpaid' ? `<button class="btn btn-sm btn-success" onclick="markInvoicePaid('${i.id}')">Mark paid</button>` : ''}
      <button class="btn btn-sm btn-danger" onclick="deleteInvoice('${i.id}')">Delete</button>
    </td>
  </tr>`).join('');
  $('#invoices-table').innerHTML = '<tr><th>Client</th><th>Amount</th><th>Description</th><th>Due</th><th>Status</th><th>Actions</th></tr>' + tbody;
}

async function loadReceipts() {
  const data = await api('/api/admin/receipts');
  const tbody = (data.receipts || []).map(r => `<tr>
    <td>${r.client_name}</td>
    <td><strong>£${Number(r.amount).toFixed(2)}</strong></td>
    <td>${new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
    <td><button class="btn btn-sm btn-danger" onclick="deleteReceipt('${r.id}')">Delete</button></td>
  </tr>`).join('');
  $('#receipts-table').innerHTML = '<tr><th>Client</th><th>Amount</th><th>Date</th><th>Actions</th></tr>' + tbody;
}

async function loadMedia() {
  const data = await api('/api/admin/media');
  const tbody = (data.media || []).map(m => `<tr>
    <td>${m.client_name}</td>
    <td style="font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis">${m.filename}</td>
    <td><span class="badge ${m.type === 'video' ? 'unpaid' : 'confirmed'}">${m.type || 'image'}</span></td>
    <td>${m.caption || '—'}</td>
    <td>${new Date(m.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
    <td><button class="btn btn-sm btn-danger" onclick="deleteMedia('${m.id}')">Delete</button></td>
  </tr>`).join('');
  $('#media-table').innerHTML = '<tr><th>Client</th><th>File</th><th>Type</th><th>Caption</th><th>Date</th><th>Actions</th></tr>' + tbody;
}

function renderCalendar() {
  const grid = $('#calendar-grid');
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = toDateStr(new Date());
  $('#cal-month').textContent = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const startDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  let html = '';
  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, month, 0).getDate() - startDay + i + 1;
    html += `<div class="cal-cell other"><div class="day">${d}</div></div>`;
  }
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayBk = allBookings.filter(b => b.booking_date === dateStr);
    const isToday = dateStr === todayStr ? ' today' : '';
    const dots = dayBk.map(b => `<span class="cal-dot ${b.status || 'confirmed'}"></span>`).join('');
    const names = dayBk.slice(0, 3).map(b => `<span class="cal-name">${b.client_name}${b.dog_name ? ' &amp; ' + b.dog_name : ''}</span>`).join('');
    html += `<div class="cal-cell${isToday}" onclick="openDay('${dateStr}')"><div class="day">${d}</div><div>${dots}</div>${names}</div>`;
  }
  grid.innerHTML = html;
}

function openDay(date) {
  const dayBk = allBookings.filter(b => b.booking_date === date);
  $('#day-title').textContent = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#day-content').innerHTML = dayBk.length
    ? dayBk.map(b => `<div class="day-booking">
        <div>
          <strong>${b.client_name}</strong>${b.dog_name ? ' &amp; ' + b.dog_name : ''}<br>
          <span style="font-size:.83rem;color:#555">${SERVICE_LABELS[b.service] || b.service}${b.start_time ? ' · ' + b.start_time.slice(0,5) : ''}</span>
          ${b.notes ? `<br><span style="font-size:.78rem;color:#888">${b.notes}</span>` : ''}
        </div>
        <div class="act" style="flex-direction:column;align-items:flex-end">
          <span class="badge ${b.status}">${b.status}</span>
          ${b.status === 'confirmed' ? `<button class="btn btn-sm btn-success" style="margin-top:.3rem" onclick="setBookingStatus('${b.id}','completed',this)">✓ Done</button>` : ''}
          ${b.status === 'confirmed' ? `<button class="btn btn-sm btn-warn" onclick="setBookingStatus('${b.id}','cancelled',this)">✕ Cancel</button>` : ''}
        </div>
      </div>`)
      .join('')
    : '<p style="color:#aaa;font-size:.9rem">No bookings on this day.</p>';
  $('#qb-date').value = date;
  fillClientSelects();
  $('#day-popup').classList.add('active');
}

window.closeDayPopup = () => { $('#day-popup').classList.remove('active'); };
window.closeEditModal = () => { $('#edit-client-modal').classList.remove('active'); };

window.editClient = (id) => {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  const f = $('#edit-client-form');
  f.id.value = c.id;
  f.name.value = c.name || '';
  f.email.value = c.email || '';
  f.password.value = '';
  f.dog_name.value = c.dog_name || '';
  f.dog_breed.value = c.dog_breed || '';
  f.phone.value = c.phone || '';
  f.address.value = c.address || '';
  f.notes.value = c.notes || '';
  $('#edit-client-modal').classList.add('active');
};

window.deleteClient = async (id) => { if (!confirm('Delete this client and all their data?')) return; await api('/api/admin/clients', 'DELETE', { id }); loadClients(); };

window.setBookingStatus = async (id, status, btn) => {
  btn.disabled = true;
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  await api('/api/admin/bookings', 'PATCH', { id, client_id: b.client_id, booking_date: b.booking_date, start_time: b.start_time || null, end_time: b.end_time || null, service: b.service, status, notes: b.notes || null });
  await loadBookings();
  if ($('#day-popup').classList.contains('active')) openDay(b.booking_date);
};

window.deleteBooking = async (id) => { if (!confirm('Delete this booking?')) return; await api('/api/admin/bookings', 'DELETE', { id }); loadBookings(); };

window.markInvoicePaid = async (id) => {
  const inv = allInvoices.find(i => i.id === id);
  if (!inv) return;
  await api('/api/admin/invoices', 'PATCH', { id, client_id: inv.client_id, amount: inv.amount, description: inv.description || '', due_date: inv.due_date || null, status: 'paid' });
  loadInvoices();
};

window.deleteInvoice = async (id) => { if (!confirm('Delete this invoice?')) return; await api('/api/admin/invoices', 'DELETE', { id }); loadInvoices(); };
window.deleteReceipt = async (id) => { if (!confirm('Delete this receipt?')) return; await api('/api/admin/receipts', 'DELETE', { id }); loadReceipts(); };
window.deleteMedia = async (id) => { if (!confirm('Delete this media?')) return; await api('/api/admin/media', 'DELETE', { id }); loadMedia(); };

async function init() {
  const me = await fetch('/api/auth/me', { credentials: 'include' });
  if (!me.ok) return (location.href = '/login.html#admin');
  const { user } = await me.json();
  if (user.role !== 'admin') return (location.href = '/portal.html');

  $$('.tab[data-tab]').forEach(btn => {
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
    try { await api('/api/admin/clients', 'POST', body); e.target.reset(); loadClients(); }
    catch (err) { alert('Error: ' + err.message); }
  });

  $('#edit-client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try { await api('/api/admin/clients', 'PATCH', body); closeEditModal(); loadClients(); }
    catch (err) { alert('Error: ' + err.message); }
  });

  $('#booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try { await api('/api/admin/bookings', 'POST', body); e.target.reset(); loadBookings(); }
    catch (err) { alert('Error: ' + err.message); }
  });

  $('#quick-booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await api('/api/admin/bookings', 'POST', body);
      const date = body.booking_date;
      await loadBookings();
      openDay(date);
    } catch (err) { alert('Error: ' + err.message); }
  });

  $('#invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try { await api('/api/admin/invoices', 'POST', body); e.target.reset(); loadInvoices(); }
    catch (err) { alert('Error: ' + err.message); }
  });

  $('#receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try { await api('/api/admin/receipts', 'POST', body); e.target.reset(); loadReceipts(); loadInvoices(); }
    catch (err) { alert('Error: ' + err.message); }
  });

  const pendingFiles = [];
  $('#media-files').addEventListener('change', async (e) => {
    for (const f of e.target.files) {
      const data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(f);
      });
      pendingFiles.push({ name: f.name, data, contentType: f.type, type: f.type.startsWith('video') ? 'video' : 'image' });
    }
    $('#dropzone div').textContent = `${pendingFiles.length} file(s) selected`;
  });

  $('#media-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingFiles.length) return alert('Please select at least one file.');
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await api('/api/admin/media', 'POST', { client_id: body.client_id, caption: body.caption, files: pendingFiles });
      e.target.reset();
      pendingFiles.length = 0;
      $('#dropzone div').textContent = 'Click or drag images & videos here';
      loadMedia();
    } catch (err) { alert('Error: ' + err.message); }
  });

  await Promise.all([loadClients(), loadBookings(), loadInvoices(), loadReceipts(), loadMedia()]);
}

init().catch(err => { console.error(err); alert('Failed to load admin: ' + err.message); });
