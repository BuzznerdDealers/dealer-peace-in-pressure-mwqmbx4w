/* Handoff DOM-binding helper (js/bind.js), then the page's own behaviour (js/pages/athlete-onboarding.js). */
/*
 * Peace In Pressure — tiny DOM-binding helper (no dependencies).
 *
 * Interactive pages describe their UI as `state` + a `view(ctrl)` function that returns
 * plain values and event handlers. The markup refers to those names with data attributes:
 *
 *   data-bind="key"              textContent  = view[key]
 *   data-bind-style="prop:key"   style[prop]  = view[key]          (several pairs separated by ;)
 *   data-bind-value="key"        el.value     = view[key]
 *   data-if="key"                el.hidden    = !view[key]         (form controls inside a hidden block are disabled)
 *   data-on="event:key"          addEventListener(event, view[key])
 *
 * Keys may be "list.prop" with data-index="n" → view.list[n].prop (used for repeated rows).
 * Port these to your framework's state/props; nothing here is meant to ship as-is.
 */
(function () {
  function get(vals, key, index) {
    var parts = key.split('.');
    var v = vals[parts[0]];
    if (parts.length > 1) {
      v = v == null ? v : v[+index];
      for (var i = 1; i < parts.length; i++) v = v == null ? v : v[parts[i]];
    }
    return v;
  }

  function update(root, vals) {
    root.querySelectorAll('[data-bind]').forEach(function (el) {
      var v = get(vals, el.dataset.bind, el.dataset.index);
      el.textContent = v == null ? '' : v;
    });
    root.querySelectorAll('[data-bind-style]').forEach(function (el) {
      el.dataset.bindStyle.split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        el.style.setProperty(pair.slice(0, i), get(vals, pair.slice(i + 1), el.dataset.index));
      });
    });
    root.querySelectorAll('[data-bind-value]').forEach(function (el) {
      var v = get(vals, el.dataset.bindValue, el.dataset.index);
      if (el.value !== String(v)) el.value = v;
    });
    root.querySelectorAll('[data-if]').forEach(function (el) {
      el.hidden = !get(vals, el.dataset.if);
    });
    root.querySelectorAll('[data-if] input, [data-if] select, [data-if] textarea, [data-if] button').forEach(function (f) {
      f.disabled = !!f.closest('[data-if][hidden]');
    });
  }

  function wire(root, getVals) {
    root.querySelectorAll('[data-on]').forEach(function (el) {
      el.dataset.on.split(' ').forEach(function (spec) {
        var i = spec.indexOf(':'), evt = spec.slice(0, i), key = spec.slice(i + 1);
        el.addEventListener(evt, function (e) {
          var fn = get(getVals(), key, el.dataset.index);
          if (typeof fn === 'function') fn(e);
        });
      });
    });
  }

  /* page(initialState, view, { afterRender }) → controller { state, setState } */
  function page(initial, view, opts) {
    var ctrl = { state: Object.assign({}, initial) };
    function render() {
      var v = view(ctrl);
      update(document, v);
      if (opts && opts.afterRender) opts.afterRender(v);
    }
    ctrl.setState = function (patch) {
      Object.assign(ctrl.state, typeof patch === 'function' ? patch(ctrl.state) : patch);
      render();
    };
    wire(document, function () { return view(ctrl); });
    render();
    return ctrl;
  }

  window.PIP = { get: get, update: update, wire: wire, page: page };
})();


// The handoff's forms are plain <div data-fake-form> here (a coded widget cannot hold a <form>); give them the
// same behaviour: validate on the submit button, then fire a "submit" event for the page script, and support reset().
(function () {
  document.querySelectorAll('[data-fake-form]').forEach(function (box) {
    box.reset = function () {
      box.querySelectorAll('input, textarea, select').forEach(function (el) {
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked;
        else el.value = el.defaultValue || '';
      });
    };
    box.addEventListener('click', function (e) {
      var btn = e.target.closest('button[type="submit"], button:not([type])');
      if (!btn || !box.contains(btn) || btn.closest('[data-fake-form]') !== box) return;
      var controls = Array.prototype.filter.call(box.querySelectorAll('input, select, textarea'), function (el) { return !el.disabled && el.offsetParent !== null || el.type === 'file'; });
      for (var i = 0; i < controls.length; i++) {
        if (controls[i].type !== 'file' && !controls[i].checkValidity()) { controls[i].reportValidity(); return; }
      }
      var ev = new Event('submit', { cancelable: true, bubbles: false });
      box.dispatchEvent(ev);
    });
  });
})();

/* Athlete onboarding — 4-step wizard (Profile & photos → Legal → Payouts → Review → Done). */
(function () {
const LABELS = ['Profile & photos', 'Legal agreement', 'Payouts & tax', 'Review'];
const PHOTOS = [
  { key: 'back', label: 'Back photo (profile)', required: true },
  { key: 'front', label: 'Card photo 1', required: true },
  { key: 'action', label: 'Card photo 2', required: false },
];

PIP.page({ step: 0, maxStep: 0, files: {}, exclusive: false, signing: false, stripe: false, noStripe: false, payoutError: false }, function (c) {
  var s = c.state;
  function go(step) {
    c.setState(function (st) { return { step: step, maxStep: Math.max(st.maxStep, step) }; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  var disp = function (i) { return s.step === i ? 'flex' : 'none'; };
  var done = s.step === 4;
  return {
    d1: disp(0), d2: disp(1), d3: disp(2), d4: disp(3), d5: disp(4),
    steps: LABELS.map(function (label, i) {
      var cur = i === s.step, complete = i < s.maxStep || done;
      return {
        label: label, mark: complete && !cur ? '✓' : String(i + 1),
        bg: cur ? 'rgba(0,205,253,0.12)' : 'transparent',
        fg: cur ? '#f4fbff' : i <= s.maxStep ? '#c4d4e2' : '#6f8598',
        dotBg: complete && !cur ? '#00cdfd' : cur ? '#00fbff' : 'rgba(255,255,255,0.08)',
        dotFg: complete || cur ? '#020617' : '#9fb4c6',
        go: function () { if (!done && i <= s.maxStep) go(i); }
      };
    }),
    photos: PHOTOS.map(function (p) {
      var f = s.files[p.key];
      return {
        label: p.label,
        status: f || (p.required ? 'Required · click to upload' : 'Optional · click to upload'),
        statusColor: f ? '#00fbff' : '#8da2b5',
        border: f ? '#00cdfd' : 'rgba(255,255,255,0.25)',
        onFile: function (e) {
          var n = e.target.files[0] && e.target.files[0].name;
          c.setState(function (st) { var files = Object.assign({}, st.files); files[p.key] = n; return { files: files }; });
        }
      };
    }),
    exclusive: s.exclusive, signing: s.signing,
    exclYes: function () { c.setState({ exclusive: true }); }, exclNo: function () { c.setState({ exclusive: false }); },
    signYes: function () { c.setState({ signing: true }); }, signNo: function () { c.setState({ signing: false }); },
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    stripeLabel: s.stripe ? 'Connected ✓' : 'Set up →',
    stripeBorder: s.stripe ? '#00cdfd' : 'rgba(255,255,255,0.12)',
    connectStripe: function () { c.setState({ stripe: true, noStripe: false, payoutError: false }); }, // TODO: Stripe Connect onboarding link
    noStripe: s.noStripe,
    toggleNoStripe: function (e) { c.setState({ noStripe: e.target.checked, payoutError: false }); },
    payoutError: s.payoutError,
    review: [
      { label: 'Profile & photos', status: s.files.back && s.files.front ? 'Complete' : 'Missing photos', color: s.files.back && s.files.front ? '#00fbff' : '#ffc46b' },
      { label: 'Athlete Legal Bundle v2026.01.11', status: 'Signed', color: '#00fbff' },
      { label: 'Payouts & tax form', status: s.stripe ? 'Stripe connected' : 'Not set up', color: s.stripe ? '#00fbff' : '#ffc46b' }
    ],
    next: function (e) {
      e.preventDefault();
      if (s.step === 2 && !s.stripe) return c.setState({ payoutError: true });
      go(s.step + 1);
    },
    back: function () { go(Math.max(0, s.step - 1)); },
    finish: function (e) { e.preventDefault(); go(4); }
  };
});
})();

