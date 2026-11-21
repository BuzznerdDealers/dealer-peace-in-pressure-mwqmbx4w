// Contact & Requests: /contact#correction (or #order, #athlete, #press, #other) preselects the topic.
(function () {
  var topic = (location.hash || '').slice(1);
  var select = document.querySelector('[data-bz-node="ct-form"] select');
  if (!select || !topic) return;
  var has = Array.prototype.some.call(select.options, function (o) { return o.value === topic; });
  if (!has) return;
  select.value = topic;
  select.dispatchEvent(new Event('change', { bubbles: true }));
})();
