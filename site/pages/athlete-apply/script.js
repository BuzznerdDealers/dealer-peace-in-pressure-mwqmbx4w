// Athlete application: applicants must be 18 or older. Under 18 shows a live warning and blocks the submit.
(function () {
  var field = document.querySelector('[data-bz-field="aa-dob"]');
  var input = field && field.querySelector('input[type="date"]');
  if (!input) return;
  var note = document.createElement('p');
  note.className = 'ap-underage';
  note.setAttribute('role', 'alert');
  note.hidden = true;
  note.textContent = 'Athletes must be 18 or older to join.';
  field.appendChild(note);
  function check() {
    var under = false;
    if (input.value) {
      var d = new Date(input.value + 'T00:00:00'), now = new Date();
      var age = now.getFullYear() - d.getFullYear();
      if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
      under = age < 18;
    }
    note.hidden = !under;
    input.setCustomValidity(under ? 'Athletes must be 18 or older to join.' : '');
  }
  input.addEventListener('change', check);
  input.addEventListener('input', check);
})();
