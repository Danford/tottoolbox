// Bumplings: a picture of the baby for each week, inside the womb. Watercolor illustrations (img/week-NN.jpg,
// weeks 4 to 40) drawn to scale for the womb: a ball of cells at week 4, an embryo curled like a C in its sac,
// about half the womb by 12 weeks, nearly all of it from about 20, and head down and snug from about 32.
// babyArt(week) returns the <img> as text. Weeks past 40 show week 40.
function babyArt(w) {
  const wk = Math.max(4, Math.min(40, w));
  return `<img src="img/week-${String(wk).padStart(2, '0')}.jpg" width="480" height="480" alt="A picture of the baby at week ${wk}">`;
}
