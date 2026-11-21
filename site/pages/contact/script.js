// Contact & Requests
//  - /contact#correction (or #order, #athlete, #press, #other) preselects the topic; "Order or shipping" is the default.
//  - The correction note sits inside the form, right under the "What needs correcting" menu, only for that topic.
(function () {
  var form = document.querySelector('[data-bz-node="ct-form"] form');
  var select = form && form.querySelector('[data-bz-field="cr-topic"] select');
  if (!select) return;
  var blank = select.options[0];
  if (blank && blank.value === '') select.removeChild(blank);
  var wanted = (location.hash || '').slice(1);
  var has = function (v) { return Array.prototype.some.call(select.options, function (o) { return o.value === v; }); };
  select.value = has(wanted) ? wanted : 'order';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  var note = document.querySelector('[data-bz-node="ct-note"]');
  var anchor = form.querySelector('[data-bz-field="cr-correction"]');
  if (note && anchor) {
    anchor.parentNode.insertBefore(note, anchor.nextSibling);
    note.style.flex = '1 1 100%';
    var sync = function () { note.hidden = select.value !== 'correction'; };
    select.addEventListener('change', sync);
    sync();
  }
})();
