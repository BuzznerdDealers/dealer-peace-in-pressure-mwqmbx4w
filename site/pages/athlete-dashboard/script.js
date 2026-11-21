/* Handoff DOM-binding helper (js/bind.js), then the page's own behaviour (js/pages/athlete-dashboard.js). */
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

/* Athlete dashboard — tab switching and form confirmations. Table data is static sample content. */
(function () {
const TABS = ['Overview', 'Sales', 'Payouts', 'Achievements', 'Profile', 'Documents'];

PIP.page({ tab: 0, achSent: false, profileSaved: false }, function (c) {
  var s = c.state;
  var v = function (i) { return s.tab === i ? 'flex' : 'none'; };
  return {
    v0: v(0), v1: v(1), v2: v(2), v3: v(3), v4: v(4), v5: v(5),
    tabs: TABS.map(function (label, i) {
      return { label: label, bg: s.tab === i ? 'rgba(0,205,253,0.12)' : 'transparent', fg: s.tab === i ? '#f4fbff' : '#9fb4c6', go: function () { c.setState({ tab: i }); } };
    }),
    achSent: s.achSent, profileSaved: s.profileSaved,
    submitAch: function (e) { e.preventDefault(); e.target.reset(); c.setState({ achSent: true }); },
    saveProfile: function (e) { e.preventDefault(); c.setState({ profileSaved: true }); }
  };
});
})();

