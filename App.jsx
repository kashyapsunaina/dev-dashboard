import { useState, useEffect } from 'react';
import { TYPES, FAKE, LIVE, WC } from './api.js';

const LS = 'devdash.react.v1';
const mk = (t) => ({ id: Math.random().toString(36).slice(2, 9), type: t, size: t === 'news' ? 2 : 1, cfg: { ...TYPES[t].def } });

function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem(LS));
    if (d && Array.isArray(d.widgets)) return d;
  } catch (x) {}
  return { widgets: ['github', 'weather', 'news', 'crypto'].map(mk), theme: null, live: false };
}

function emptyReason(w) {
  const c = w.cfg;
  if (w.type === 'github' && !c.user.trim()) return 'Add a GitHub username in settings.';
  if (w.type === 'weather' && !c.city.trim()) return 'Add a city in settings.';
  if (w.type === 'crypto' && !c.coins.split(',').some((s) => s.trim())) return 'Add at least one coin id in settings.';
  return '';
}

function View({ type, d }) {
  if (type === 'github')
    return (
      <>
        <div className="who"><i>{d.login[0].toUpperCase()}</i><div><b>{d.name}</b><div className="mute">@{d.login}</div></div></div>
        <div className="stats">
          <div><b>{d.repos}</b><span>repos</span></div>
          <div><b>{d.followers.toLocaleString()}</b><span>followers</span></div>
          <div><b>{d.stars.toLocaleString()}</b><span>stars</span></div>
        </div>
      </>
    );
  if (type === 'news')
    return d.map((x, i) => (
      <div className="row" key={i}>
        <a href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a>
        <span className="mute" style={{ whiteSpace: 'nowrap' }}>▲{x.score} · {x.n} 💬</span>
      </div>
    ));
  if (type === 'weather')
    return (
      <>
        <div className="mute">{d.city}</div>
        <div className="big">{d.t}°C</div>
        <div style={{ marginTop: 8 }}>{WC[d.code] || 'Mixed conditions'}</div>
        <div className="mute">Wind {d.wind} km/h</div>
      </>
    );
  return d.map((x) => (
    <div className="row" key={x.id}>
      <b>{x.id}</b>
      <span>
        ${x.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
        <span className={x.chg >= 0 ? 'up' : 'dn'}>{x.chg >= 0 ? '▲' : '▼'} {Math.abs(x.chg).toFixed(2)}%</span>
      </span>
    </div>
  ));
}

function Settings({ w, onSave }) {
  const [draft, setDraft] = useState(w.cfg);
  const submit = (ev) => {
    ev.preventDefault();
    const cfg = { ...draft };
    if ('count' in cfg) cfg.count = Math.min(10, Math.max(3, parseInt(cfg.count) || 5));
    onSave(cfg);
  };
  return (
    <form className="set open" onSubmit={submit}>
      {TYPES[w.type].f.map(([k, label]) => (
        <label key={k}>{label}
          <input value={draft[k]} onChange={(ev) => setDraft({ ...draft, [k]: ev.target.value })} />
        </label>
      ))}
      <button className="btn pri">Save settings</button>
    </form>
  );
}

function Widget({ w, live, update, remove, dragId, setDragId, move }) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [st, setSt] = useState({ s: 'loading' });
  const why = emptyReason(w);

  // each widget fetches its own data and handles its own loading / error state
  useEffect(() => {
    if (why) { setSt({ s: 'empty' }); return; }
    let off = false;
    setSt({ s: 'loading' });
    (live ? LIVE : FAKE)[w.type](w.cfg)
      .then((d) => !off && setSt(Array.isArray(d) && !d.length ? { s: 'none' } : { s: 'ok', d }))
      .catch((x) => !off && setSt({ s: 'err', x }));
    return () => { off = true; };
  }, [live, tick, w.type, JSON.stringify(w.cfg)]);

  let body;
  if (st.s === 'loading') body = (<><div className="sk" style={{ width: '60%' }} /><div className="sk" /><div className="sk" style={{ width: '80%' }} /></>);
  else if (st.s === 'empty') body = <div className="msg">{why}</div>;
  else if (st.s === 'none') body = <div className="msg">Nothing to show yet.</div>;
  else if (st.s === 'err')
    body = (
      <div className="msg err">
        {st.x instanceof TypeError ? 'Could not reach the service. Check your connection.' : st.x.message}
        <br /><br /><button className="btn" onClick={() => setTick(tick + 1)}>Try again</button>
      </div>
    );
  else body = <View type={w.type} d={st.d} />;

  return (
    <section
      className={`w s${w.size}${dragId === w.id ? ' drag' : ''}`}
      draggable
      onDragStart={() => setDragId(w.id)}
      onDragEnd={() => setDragId(null)}
      onDragEnter={() => dragId && dragId !== w.id && move(dragId, w.id)}
      onDragOver={(ev) => ev.preventDefault()}
    >
      <div className="wh">
        <b>{TYPES[w.type].name}</b>
        <button className="ib" aria-label="Refresh" title="Refresh" onClick={() => setTick(tick + 1)}>↻</button>
        <button className="ib" aria-label="Resize" title="Resize (1, 2 or 3 columns)" onClick={() => update(w.id, { size: (w.size % 3) + 1 })}>⇔</button>
        <button className="ib" aria-label="Settings" title="Settings" onClick={() => setOpen(!open)}>⚙</button>
        <button className="ib" aria-label="Remove widget" title="Remove" onClick={() => remove(w.id)}>✕</button>
      </div>
      {open && <Settings w={w} onSave={(cfg) => { update(w.id, { cfg }); setOpen(false); }} />}
      <div className="wb">{body}</div>
    </section>
  );
}

export default function App() {
  const [S, setS] = useState(loadState);
  const [menu, setMenu] = useState(false);
  const [dragId, setDragId] = useState(null);

  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (x) {} }, [S]);
  useEffect(() => {
    const r = document.documentElement;
    S.theme ? (r.dataset.theme = S.theme) : delete r.dataset.theme;
  }, [S.theme]);
  useEffect(() => {
    const close = (ev) => !ev.target.closest('.menu') && setMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const setWidgets = (fn) => setS((s) => ({ ...s, widgets: fn(s.widgets) }));
  const add = (t) => { setWidgets((ws) => [...ws, mk(t)]); setMenu(false); };
  const update = (id, patch) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const remove = (id) => setWidgets((ws) => ws.filter((w) => w.id !== id));
  const move = (from, to) =>
    setWidgets((ws) => {
      const a = ws.filter((w) => w.id !== from);
      a.splice(ws.findIndex((w) => w.id === to), 0, ws.find((w) => w.id === from));
      return a;
    });
  const toggleTheme = () => {
    const dark = S.theme === 'dark' || (!S.theme && matchMedia('(prefers-color-scheme:dark)').matches);
    setS({ ...S, theme: dark ? 'light' : 'dark' });
  };

  return (
    <>
      <header>
        <h1>Dev Dashboard</h1>
        <div className="bar">
          <label className="live"><input type="checkbox" checked={S.live} onChange={(ev) => setS({ ...S, live: ev.target.checked })} /> Live data</label>
          <button className="btn" onClick={toggleTheme}>Theme</button>
          <div className="menu">
            <button className="btn pri" onClick={() => setMenu(!menu)}>Add widget</button>
            <div className={`drop${menu ? ' open' : ''}`}>
              {Object.keys(TYPES).map((k) => <button key={k} onClick={() => add(k)}>{TYPES[k].name}</button>)}
            </div>
          </div>
        </div>
      </header>
      <main id="grid">
        {S.widgets.map((w) => (
          <Widget key={w.id} w={w} live={S.live} update={update} remove={remove} dragId={dragId} setDragId={setDragId} move={move} />
        ))}
        {!S.widgets.length && (
          <div className="empty">
            <h2>Your dashboard is empty</h2>Add a widget to get started.
            <div className="chips">{Object.keys(TYPES).map((k) => <button key={k} className="btn" onClick={() => add(k)}>{TYPES[k].name}</button>)}</div>
          </div>
        )}
      </main>
    </>
  );
}
