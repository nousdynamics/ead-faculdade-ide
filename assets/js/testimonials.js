// testimonials.js — navegação horizontal do carrossel de depoimentos
(function () {
  var track = document.getElementById('reviewsTrack');
  if (!track) return;
  var prev = document.querySelector('.reviews-nav--prev');
  var next = document.querySelector('.reviews-nav--next');

  function step() {
    var card = track.querySelector('.review-card');
    return card ? card.getBoundingClientRect().width + 20 : 320;
  }
  if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
})();
