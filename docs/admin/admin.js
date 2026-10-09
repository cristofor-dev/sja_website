import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const app = document.getElementById('app');
const state = { me: null, tab: 'post' };

/* ── small helpers ─────────────────────────────────────────────── */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Requested-With': 'sja-admin' };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) { state.me = null; render(); }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function toast(text, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 5000 : 2200);
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + (s.length <= 10 ? '' : 'Z'));
  return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* an <input type=datetime-local> value ⇄ the "YYYY-MM-DD HH:MM:SS" (UTC) stored in D1 */
const toLocalInput = (s) => {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString().slice(0, 19).replace('T', ' ') : null);

function slugify(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function upload(file) {
  const form = new FormData();
  form.append('file', file);
  return api('/api/admin/upload', { method: 'POST', form });
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

/* ── TipTap: a YouTube node, stored as {type:'youtube', attrs:{videoId}} ── */

const YouTube = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() { return { videoId: { default: null } }; },
  parseHTML() { return [{ tag: 'div[data-youtube]' }]; },
  renderHTML({ node }) {
    return ['div', mergeAttributes({ 'data-youtube': node.attrs.videoId, class: 'yt' }), `▶ YouTube video ${node.attrs.videoId}`];
  },
});

function youtubeId(input) {
  const m = String(input).trim().match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || String(input).trim().match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

/* ── views ─────────────────────────────────────────────────────── */

function shell(inner) {
  const tabs = [['post', 'Blog posts'], ['page', 'Pages']];
  if (state.me.role === 'admin') tabs.push(['users', 'People']);
  app.innerHTML = `
    <div class="top">
      <img src="/assets/logo_sja.png" alt="">
      <b>SJA website — admin</b>
      <span>${esc(state.me.email)} (${state.me.role})</span>
      <a href="/" target="_blank" rel="noopener">View site</a>
      <button class="btn ghost small" id="logout">Sign out</button>
    </div>
    <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" aria-current="${state.tab === k}">${l}</button>`).join('')}</div>
    <main>${inner}</main>`;
  app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; if (location.hash) location.hash = ''; else render(); }));
  app.querySelector('#logout').onclick = async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Requested-With': 'sja-admin' } }); state.me = null; render(); };
}

function loginView(error) {
  const messages = {
    denied: 'That Google account is not on the allow-list. Ask an administrator to add your e-mail address.',
    failed: 'Sign-in did not complete. Please try again.',
  };
  app.innerHTML = `
    <div class="card login">
      <img src="/assets/logo_sja.png" alt="">
      <h1>Website admin</h1>
      <p>Sign in with your Google account to edit pages and blog posts.</p>
      <a class="btn" href="/api/auth/login">Sign in with Google</a>
      ${error ? `<p class="msg">${esc(messages[error] || 'Sign-in failed.')}</p>` : ''}
    </div>`;
}

async function listView() {
  const type = state.tab;
  const noun = type === 'post' ? 'post' : 'page';
  shell(`<div class="bar"><h1>${type === 'post' ? 'Blog posts' : 'Pages'}</h1><a class="btn" href="#/new/${type}">New ${noun}</a></div><div class="card" id="list"><p class="empty">Loading…</p></div>`);
  const rows = await api(`/api/admin/content?type=${type}`).catch((e) => { toast(e.message, true); return []; });
  const list = app.querySelector('#list');
  if (!rows.length) { list.innerHTML = `<p class="empty">No ${noun}s yet. Create the first one.</p>`; return; }
  const base = type === 'post' ? '/blog/' : '/p/';
  list.innerHTML = `<table><thead><tr><th>Title</th><th>Status</th><th>${type === 'post' ? 'Date' : 'Updated'}</th><th></th></tr></thead><tbody>${rows.map((r) => `
    <tr><td><a href="#/edit/${r.id}"><b>${esc(r.title)}</b></a><div class="hint">${base}${esc(r.slug)}${r.show_in_menu ? ' · in menu' : ''}</div></td>
    <td><span class="pill ${r.status}">${r.status}</span></td>
    <td>${fmtDate(type === 'post' ? r.published_at : r.updated_at)}</td>
    <td class="actions"><a class="btn ghost small" href="${base}${esc(r.slug)}" target="_blank" rel="noopener">${r.status === 'published' ? 'View' : 'Preview'}</a>
    <a class="btn ghost small" href="#/edit/${r.id}">Edit</a>
    <button class="btn danger small" data-del="${r.id}" data-title="${esc(r.title)}">Delete</button></td></tr>`).join('')}</tbody></table>`;
  list.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!confirm(`Delete “${b.dataset.title}”? This cannot be undone.`)) return;
    try { await api(`/api/admin/content/${b.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); listView(); } catch (e) { toast(e.message, true); }
  }));
}

let editor = null;

async function editView(id, newType) {
  const isNew = !id;
  let item = { type: newType, title: '', slug: '', excerpt: '', cover: null, status: 'draft', show_in_menu: 0, menu_label: '', published_at: null, body: { type: 'doc', content: [] } };
  if (!isNew) {
    try { item = await api(`/api/admin/content/${id}`); } catch (e) { toast(e.message, true); location.hash = ''; return; }
  }
  const isPost = item.type === 'post';
  let slugTouched = !isNew;
  let dirty = false;
  state.tab = item.type;

  shell(`
    <div class="bar"><h1>${isNew ? 'New' : 'Edit'} ${isPost ? 'post' : 'page'}</h1>
      <div class="row-btns"><a class="btn ghost" href="#">← Back</a><button class="btn" id="save">Save</button></div></div>
    <div class="edit">
      <div>
        <label class="field"><input class="title-input" type="text" id="title" placeholder="Title" value="${esc(item.title)}"></label>
        <div class="tools" id="tools"></div>
        <div class="editor" id="editor"></div>
      </div>
      <aside class="card side">
        <h2>Publishing</h2>
        <label class="field"><span>Status</span><select id="status">
          <option value="draft"${item.status === 'draft' ? ' selected' : ''}>Draft (hidden)</option>
          <option value="published"${item.status === 'published' ? ' selected' : ''}>Published</option></select></label>
        ${isPost ? `<label class="field"><span>Publish date</span><input type="datetime-local" id="date" value="${toLocalInput(item.published_at)}"><p class="hint">A future date keeps the post hidden until then.</p></label>` : ''}
        <label class="field"><span>Web address</span><input type="text" id="slug" value="${esc(item.slug)}" placeholder="auto from title"><p class="hint">${isPost ? '/blog/' : '/p/'}<b id="slugPreview"></b></p></label>
        ${isPost ? '' : `<label class="check"><input type="checkbox" id="menu"${item.show_in_menu ? ' checked' : ''}> Show in the menu (under Blog)</label>
        <label class="field"><span>Menu label</span><input type="text" id="menuLabel" value="${esc(item.menu_label || '')}" placeholder="same as title"></label>`}
        <label class="field"><span>Summary</span><textarea id="excerpt" rows="3" maxlength="400" placeholder="Shown in the blog list and when shared">${esc(item.excerpt)}</textarea></label>
        <div class="cover"><span class="hint">${isPost ? 'Cover image' : 'Image for sharing'}</span>
          <div id="coverBox"></div></div>
      </aside>
    </div>`);

  const $ = (s) => app.querySelector(s);
  const slugInput = $('#slug');
  const updateSlugPreview = () => { $('#slugPreview').textContent = slugify(slugInput.value || $('#title').value) || '…'; };
  updateSlugPreview();

  $('#title').addEventListener('input', () => { dirty = true; if (!slugTouched) { slugInput.value = slugify($('#title').value); } updateSlugPreview(); });
  slugInput.addEventListener('input', () => { slugTouched = true; dirty = true; updateSlugPreview(); });
  app.querySelectorAll('.side input, .side select, .side textarea').forEach((el) => el.addEventListener('input', () => (dirty = true)));

  let cover = item.cover;
  const drawCover = () => {
    $('#coverBox').innerHTML = `${cover ? `<img src="${esc(cover)}" alt="">` : ''}<div class="row-btns">
      <button class="btn ghost small" id="coverPick">${cover ? 'Replace' : 'Choose image'}</button>${cover ? '<button class="btn ghost small" id="coverRemove">Remove</button>' : ''}</div>`;
    $('#coverPick').onclick = async () => {
      const f = await pickFile('image/jpeg,image/png,image/webp,image/gif');
      if (!f) return;
      try { cover = (await upload(f)).url; dirty = true; drawCover(); } catch (e) { toast(e.message, true); }
    };
    const rm = $('#coverRemove');
    if (rm) rm.onclick = () => { cover = null; dirty = true; drawCover(); };
  };
  drawCover();

  if (editor) editor.destroy();
  editor = new Editor({
    element: $('#editor'),
    content: item.body,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener' } }),
      Image,
      YouTube,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    onUpdate: () => { dirty = true; },
    onTransaction: () => drawTools(),
  });

  const buttons = [
    ['B', 'Bold', (c) => c.toggleBold(), 'bold'],
    ['I', 'Italic', (c) => c.toggleItalic(), 'italic'],
    ['U', 'Underline', (c) => c.toggleUnderline(), 'underline'],
    ['S', 'Strikethrough', (c) => c.toggleStrike(), 'strike'],
    '|',
    ['H2', 'Heading', (c) => c.toggleHeading({ level: 2 }), ['heading', { level: 2 }]],
    ['H3', 'Sub-heading', (c) => c.toggleHeading({ level: 3 }), ['heading', { level: 3 }]],
    ['H4', 'Small heading', (c) => c.toggleHeading({ level: 4 }), ['heading', { level: 4 }]],
    ['¶', 'Paragraph', (c) => c.setParagraph(), 'paragraph'],
    '|',
    ['• List', 'Bulleted list', (c) => c.toggleBulletList(), 'bulletList'],
    ['1. List', 'Numbered list', (c) => c.toggleOrderedList(), 'orderedList'],
    ['❝', 'Quote', (c) => c.toggleBlockquote(), 'blockquote'],
    ['―', 'Divider', (c) => c.setHorizontalRule()],
    '|',
    ['Link', 'Add or edit a link', null, 'link', 'link'],
    ['Image', 'Insert an image', null, null, 'image'],
    ['PDF', 'Insert a link to a PDF', null, null, 'pdf'],
    ['Video', 'Embed a YouTube video', null, null, 'youtube'],
    '|',
    ['↶', 'Undo', (c) => c.undo()],
    ['↷', 'Redo', (c) => c.redo()],
  ];

  function drawTools() {
    const host = $('#tools');
    if (!host) return;
    host.innerHTML = buttons.map((b, i) => b === '|' ? '<span class="sep"></span>'
      : `<button type="button" data-i="${i}" title="${b[1]}" class="${b[3] && editor.isActive(...[].concat(b[3])) ? 'on' : ''}">${b[0]}</button>`).join('');
    host.querySelectorAll('button').forEach((btn) => {
      btn.onmousedown = (e) => e.preventDefault();
      btn.onclick = () => runTool(buttons[btn.dataset.i]);
    });
  }

  async function runTool(b) {
    const [, , chain, , special] = b;
    if (chain) { chain(editor.chain().focus()).run(); return; }
    try {
      if (special === 'link') {
        const prev = editor.getAttributes('link').href || 'https://';
        const url = prompt('Link address (leave empty to remove the link):', prev);
        if (url === null) return;
        if (url.trim() === '' || url.trim() === 'https://') editor.chain().focus().extendMarkRange('link').unsetLink().run();
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
      } else if (special === 'image') {
        const f = await pickFile('image/jpeg,image/png,image/webp,image/gif');
        if (!f) return;
        const alt = prompt('Describe the image for people who cannot see it (alt text):', '') ?? '';
        const { url } = await upload(f);
        editor.chain().focus().setImage({ src: url, alt }).run();
      } else if (special === 'pdf') {
        const f = await pickFile('application/pdf');
        if (!f) return;
        const { url } = await upload(f);
        const label = f.name.replace(/\.pdf$/i, '');
        const { empty } = editor.state.selection;
        if (empty) editor.chain().focus().insertContent({ type: 'text', text: label, marks: [{ type: 'link', attrs: { href: url } }] }).run();
        else editor.chain().focus().setLink({ href: url }).run();
      } else if (special === 'youtube') {
        const id = youtubeId(prompt('YouTube address:', '') || '');
        if (!id) { toast('That does not look like a YouTube address', true); return; }
        editor.chain().focus().insertContent({ type: 'youtube', attrs: { videoId: id } }).run();
      }
    } catch (e) { toast(e.message, true); }
  }
  drawTools();

  async function save() {
    const title = $('#title').value.trim();
    if (!title) { toast('Please add a title', true); return; }
    const payload = {
      type: item.type,
      title,
      slug: slugInput.value || title,
      excerpt: $('#excerpt').value,
      cover,
      status: $('#status').value,
      body: editor.getJSON(),
    };
    if (isPost) payload.published_at = fromLocalInput($('#date').value);
    else { payload.show_in_menu = $('#menu').checked ? 1 : 0; payload.menu_label = $('#menuLabel').value; }
    const btn = $('#save');
    btn.disabled = true;
    try {
      const res = await api(isNew ? '/api/admin/content' : `/api/admin/content/${id}`, { method: isNew ? 'POST' : 'PUT', body: payload });
      dirty = false;
      toast(payload.status === 'published' ? 'Saved and published' : 'Saved as draft');
      if (isNew) location.hash = `#/edit/${res.id}`;
      else { slugInput.value = res.slug; updateSlugPreview(); btn.disabled = false; }
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  }
  $('#save').onclick = save;
  window.__adminKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } };
  window.__adminDirty = () => dirty;
}

async function usersView() {
  shell('<div class="bar"><h1>People who can sign in</h1></div><div class="card" id="u"><p class="empty">Loading…</p></div>');
  const draw = async () => {
    const users = await api('/api/admin/users').catch((e) => { toast(e.message, true); return []; });
    app.querySelector('#u').innerHTML = `
      <form class="inline-form" id="add"><input type="email" name="email" placeholder="name@gmail.com" required>
        <select name="role"><option value="editor">Editor</option><option value="admin">Admin</option></select>
        <button class="btn">Add</button></form>
      <table><thead><tr><th>Google account</th><th>Role</th><th></th></tr></thead><tbody>${users.map((u) => `
        <tr><td>${esc(u.email)}${u.owner ? ' <span class="hint">(owner)</span>' : ''}</td><td>${u.role}</td>
        <td class="actions">${u.owner || u.email === state.me.email ? '' : `<button class="btn danger small" data-rm="${esc(u.email)}">Remove</button>`}</td></tr>`).join('')}</tbody></table>
      <p class="hint" style="padding:0 14px 14px">Editors can write and publish pages and posts. Admins can also manage this list.</p>`;
    app.querySelector('#add').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try { await api('/api/admin/users', { method: 'POST', body: { email: f.get('email'), role: f.get('role') } }); toast('Added'); draw(); } catch (err) { toast(err.message, true); }
    };
    app.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async () => {
      if (!confirm(`Remove ${b.dataset.rm}?`)) return;
      try { await api(`/api/admin/users/${encodeURIComponent(b.dataset.rm)}`, { method: 'DELETE' }); draw(); } catch (err) { toast(err.message, true); }
    }));
  };
  draw();
}

/* ── router ────────────────────────────────────────────────────── */

async function render() {
  window.__adminKey = null;
  window.__adminDirty = null;
  if (editor) { editor.destroy(); editor = null; }
  if (!state.me) {
    const me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!me) { loginView(new URLSearchParams(location.search).get('error')); return; }
    state.me = me;
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }
  const m = location.hash.match(/^#\/(edit|new)\/(\w+)/);
  if (m && m[1] === 'edit') return editView(Number(m[2]));
  if (m && m[1] === 'new') return editView(null, m[2] === 'page' ? 'page' : 'post');
  if (state.tab === 'users' && state.me.role === 'admin') return usersView();
  return listView();
}

window.addEventListener('hashchange', () => {
  if (window.__adminDirty && window.__adminDirty() && !confirm('You have unsaved changes. Leave without saving?')) return;
  render();
});
window.addEventListener('keydown', (e) => window.__adminKey && window.__adminKey(e));
window.addEventListener('beforeunload', (e) => { if (window.__adminDirty && window.__adminDirty()) { e.preventDefault(); e.returnValue = ''; } });

render();
