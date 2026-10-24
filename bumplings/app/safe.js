// Bumplings: "Is it safe?", the questions everyone asks in pregnancy, answered from ACOG, CDC, FDA and
// MotherToBaby guidance. Short and plain; when the honest answer depends on the person, it says to ask.
//   q: what's asked about, also: other words people search for, cat: food | drink | med | life,
//   v: ok (generally fine) | limit (fine in moderation, or only some kinds) | avoid | ask (ask your provider first),
//   a: the answer, one to three sentences
const SAFE_CATS = [['food', '🍽️ Food'], ['drink', '☕ Drinks'], ['med', '💊 Medicines'], ['life', '🏠 Everyday']];
const SAFE_V = { ok: '✅ Generally fine', limit: '⚠️ Some kinds, or limit it', avoid: '⛔ Avoid', ask: '📞 Ask first' };
const SAFE = [
  // Food
  { q: 'Sushi', also: 'raw fish sashimi poke ceviche', cat: 'food', v: 'limit',
    a: 'Skip raw or undercooked fish: it can carry parasites and bacteria. Cooked rolls (shrimp tempura, eel, California rolls with cooked crab) and vegetable rolls are fine.' },
  { q: 'Deli meat', also: 'lunch meat cold cuts sandwich turkey ham salami', cat: 'food', v: 'limit',
    a: 'Can carry listeria. Heat it until steaming hot (165°F), as in a toasted or pressed sandwich, or skip it.' },
  { q: 'Hot dogs', also: 'sausage frankfurter', cat: 'food', v: 'limit', a: 'Fine heated until steaming hot all the way through. Not straight from the package.' },
  { q: 'Soft cheese', also: 'brie camembert feta queso fresco blue cheese goat cheese', cat: 'food', v: 'limit',
    a: 'Fine when made with pasteurized milk: check the label. Skip unpasteurized cheese. Queso fresco and similar fresh cheeses have caused listeria outbreaks even when pasteurized, so the CDC advises eating them only cooked until steaming hot.' },
  { q: 'Hard cheese', also: 'cheddar parmesan swiss', cat: 'food', v: 'ok', a: 'Fine when made with pasteurized milk, as most are: check the label. The FDA and CDC advise skipping raw-milk cheese in pregnancy.' },
  { q: 'Unpasteurized milk or juice', also: 'raw milk cider fresh-squeezed', cat: 'food', v: 'avoid',
    a: 'Can carry listeria, E. coli and salmonella. Choose pasteurized.' },
  { q: 'Eggs', also: 'runny yolk over easy soft boiled', cat: 'food', v: 'limit',
    a: 'Cook until the yolk and white are firm, or use pasteurized eggs. Skip foods with raw egg: homemade mayo, Caesar dressing, raw cookie dough or batter.' },
  { q: 'Raw cookie dough', also: 'cake batter brownie', cat: 'food', v: 'avoid', a: 'Raw egg and raw flour can both carry bacteria. Bake it first.' },
  { q: 'Undercooked meat', also: 'rare steak medium rare burger pink', cat: 'food', v: 'limit',
    a: 'Cook whole cuts to 145°F, ground meat to 160°F and poultry to 165°F. A thermometer is the only sure way.' },
  { q: 'Fish', also: 'seafood salmon shrimp cod tilapia canned light tuna sardines', cat: 'food', v: 'ok',
    a: 'Good for the baby\'s brain: 2 to 3 servings a week of low-mercury fish such as salmon, shrimp, cod, tilapia, sardines and canned light tuna.' },
  { q: 'Tuna', also: 'albacore white tuna steak', cat: 'food', v: 'limit',
    a: 'Canned light tuna is a best choice (2 to 3 servings a week). Albacore (white) tuna and yellowfin: 1 serving a week. Skip bigeye tuna.' },
  { q: 'High-mercury fish', also: 'shark swordfish king mackerel tilefish marlin orange roughy bigeye', cat: 'food', v: 'avoid',
    a: 'Shark, swordfish, king mackerel, tilefish from the Gulf of Mexico, bigeye tuna, marlin and orange roughy: mercury harms the developing brain.' },
  { q: 'Smoked salmon', also: 'lox nova', cat: 'food', v: 'limit', a: 'Refrigerated smoked fish can carry listeria. Fine cooked into a dish (a casserole, a quiche); shelf-stable canned is fine too.' },
  { q: 'Pâté', also: 'pate meat spread', cat: 'food', v: 'limit', a: 'Refrigerated pâté can carry listeria; canned or shelf-stable pâté is fine.' },
  { q: 'Liver', also: 'organ meat', cat: 'food', v: 'limit', a: 'Very high in vitamin A, which in large amounts can harm the baby. A small portion now and then at most.' },
  { q: 'Raw sprouts', also: 'alfalfa bean sprouts clover radish', cat: 'food', v: 'avoid', a: 'Hard to clean of bacteria. Cook them until steaming.' },
  { q: 'Fruit and vegetables', also: 'salad produce', cat: 'food', v: 'ok', a: 'Eat plenty. Rinse under running water first, even if you will peel them.' },
  { q: 'Peanuts and nuts', also: 'peanut butter allergy', cat: 'food', v: 'ok', a: 'Fine, unless you are allergic. Avoiding them does not prevent allergies in the baby.' },
  { q: 'Spicy food', also: 'hot sauce curry', cat: 'food', v: 'ok', a: 'Safe for the baby. It may make heartburn worse.' },
  { q: 'Honey', also: '', cat: 'food', v: 'ok', a: 'Fine for you. Babies under one year should never have honey.' },
  { q: 'Artificial sweeteners', also: 'aspartame sucralose splenda stevia diet soda', cat: 'food', v: 'limit', a: 'Considered safe in moderation (FDA). Saccharin is best limited.' },
  { q: 'Black licorice', also: 'liquorice', cat: 'food', v: 'limit', a: 'Large amounts of real licorice root (glycyrrhizin) are linked to preterm birth. Skip it or keep it small.' },
  { q: 'Leftovers', also: 'takeout', cat: 'food', v: 'limit', a: 'Refrigerate within 2 hours, eat within 3 to 4 days, and reheat until steaming hot.' },
  // Drinks
  { q: 'Coffee and caffeine', also: 'tea soda energy espresso latte', cat: 'drink', v: 'limit',
    a: 'Up to 200 mg of caffeine a day (ACOG): about one 12 oz coffee. Tea, soda and chocolate count too.' },
  { q: 'Energy drinks', also: 'red bull monster preworkout', cat: 'drink', v: 'avoid', a: 'Lots of caffeine plus herbs and stimulants that haven\'t been studied in pregnancy.' },
  { q: 'Alcohol', also: 'wine beer drink glass', cat: 'drink', v: 'avoid',
    a: 'No amount is known to be safe at any point in pregnancy (CDC, ACOG). If you drank before you knew, stopping now still helps; mention it at your visit.' },
  { q: 'Non-alcoholic beer and wine', also: 'na beer mocktail', cat: 'drink', v: 'limit', a: '"Non-alcoholic" can mean up to 0.5% alcohol. "Alcohol-free" (0.0%) versions and mocktails are fine.' },
  { q: 'Herbal tea', also: 'chamomile peppermint ginger raspberry leaf', cat: 'drink', v: 'limit',
    a: 'Ginger and peppermint in normal amounts are generally fine. Many herbs haven\'t been studied, so ask about others, and about red raspberry leaf before late pregnancy.' },
  { q: 'Kombucha', also: '', cat: 'drink', v: 'avoid', a: 'Often unpasteurized, and can contain some alcohol and caffeine.' },
  { q: 'Tap water', also: 'well water', cat: 'drink', v: 'ok', a: 'City tap water is fine. Have well water tested, and use cold water for drinking if your pipes may contain lead.' },
  // Medicines: always general, always defer to the provider
  { q: 'Acetaminophen (Tylenol)', also: 'tylenol paracetamol fever headache pain', cat: 'med', v: 'ask',
    a: 'ACOG says it remains an appropriate choice for pain and fever in pregnancy, and untreated fever has risks of its own. Use the lowest dose that works, for the shortest time, and check with your provider. In 2025 the FDA started adding a possible link with autism and ADHD to the label; studies haven\'t shown that it causes them.' },
  { q: 'Ibuprofen (Advil, Motrin)', also: 'advil motrin naproxen aleve nsaid', cat: 'med', v: 'avoid',
    a: 'The FDA advises against NSAIDs such as ibuprofen and naproxen from 20 weeks on (they can harm the baby\'s kidneys), and they are best avoided earlier unless your provider says so.' },
  { q: 'Aspirin', also: 'baby aspirin low-dose', cat: 'med', v: 'ask', a: 'Low-dose aspirin is prescribed to prevent preeclampsia for some. Don\'t take aspirin for pain unless your provider says to.' },
  { q: 'Antacids (Tums)', also: 'heartburn tums rolaids', cat: 'med', v: 'ok', a: 'Calcium carbonate antacids are a usual choice for heartburn. Avoid ones with sodium bicarbonate, and Pepto-Bismol.' },
  { q: 'Pepto-Bismol', also: 'bismuth subsalicylate kaopectate', cat: 'med', v: 'avoid', a: 'Contains a salicylate, related to aspirin. Ask for another option.' },
  { q: 'Allergy medicine', also: 'claritin zyrtec loratadine cetirizine benadryl antihistamine', cat: 'med', v: 'ask',
    a: 'Loratadine (Claritin) and cetirizine (Zyrtec) are among the best studied in pregnancy. Ask your provider which suits you.' },
  { q: 'Decongestants', also: 'sudafed pseudoephedrine phenylephrine cold medicine', cat: 'med', v: 'ask',
    a: 'Pseudoephedrine is usually avoided in the first trimester and with high blood pressure. Saline spray and a humidifier are safe first steps. Oral phenylephrine (the "PE" in many cold pills) doesn\'t work as a decongestant, the FDA\'s advisers found.' },
  { q: 'Cough and cold combinations', also: 'nyquil dayquil multi-symptom', cat: 'med', v: 'ask', a: 'They combine several drugs. Ask before taking one, and check that the ingredients don\'t double up.' },
  { q: 'Sleep aids', also: 'unisom doxylamine diphenhydramine melatonin', cat: 'med', v: 'ask',
    a: 'Doxylamine (Unisom) is also used with vitamin B6 for nausea. Melatonin hasn\'t been well studied. Ask first.' },
  { q: 'Stool softeners and laxatives', also: 'constipation colace docusate miralax fiber', cat: 'med', v: 'ok',
    a: 'Fiber, water, and docusate or polyethylene glycol (MiraLAX) are usual choices. Ask if it lasts.' },
  { q: 'Antibiotics', also: 'amoxicillin', cat: 'med', v: 'ask', a: 'Many are safe and some infections need treating for the baby\'s sake. Tell whoever prescribes that you\'re pregnant.' },
  { q: 'Prescription medicines you already take', also: 'antidepressant ssri thyroid blood pressure seizure', cat: 'med', v: 'ask',
    a: 'Don\'t stop a prescribed medicine on your own: stopping can be riskier than taking it. Ask the prescriber and your OB together.' },
  { q: 'Acne and skin retinoids', also: 'retin-a tretinoin retinol accutane isotretinoin', cat: 'med', v: 'avoid',
    a: 'Isotretinoin (Accutane) causes serious birth defects. Skip retinoid creams too. Azelaic acid and benzoyl peroxide are usual alternatives.' },
  { q: 'Vitamins and supplements', also: 'prenatal folic acid iron fish oil dha', cat: 'med', v: 'ok',
    a: 'A daily prenatal with at least 400 mcg folic acid. Ask before adding others: high-dose vitamin A, and many herbal supplements, aren\'t safe.' },
  { q: 'Vaccines', also: 'flu shot tdap rsv covid', cat: 'med', v: 'ok',
    a: 'Flu, Tdap and RSV (at 32 to 36 weeks, in season) vaccines are recommended in pregnancy (CDC, ACOG). ACOG also recommends the COVID-19 vaccine; ask about the current one. Live vaccines such as MMR and chickenpox wait until after.' },
  { q: 'Cannabis', also: 'marijuana weed cbd thc edibles', cat: 'med', v: 'avoid', a: 'Linked to lower birth weight and effects on brain development. CBD products too (FDA).' },
  { q: 'Smoking and vaping', also: 'cigarettes nicotine vape e-cigarette', cat: 'med', v: 'avoid',
    a: 'Quitting at any point helps. Call 1-800-QUIT-NOW for free help; ask your provider about safe ways to quit.' },
  // Everyday life
  { q: 'Hot tubs and saunas', also: 'jacuzzi steam room', cat: 'life', v: 'avoid', a: 'Raising your core temperature, especially early on, is linked to birth defects. A warm (not hot) bath is fine.' },
  { q: 'Exercise', also: 'workout running gym walking yoga', cat: 'life', v: 'ok',
    a: 'Aim for 150 minutes a week of moderate activity (ACOG). Keep doing what you did before, within reason. Stop and call with bleeding, dizziness, chest pain or fluid leaking.' },
  { q: 'Contact sports and falls', also: 'skiing horseback riding soccer basketball', cat: 'life', v: 'avoid', a: 'Skip activities with a risk of a fall or a blow to the belly.' },
  { q: 'Scuba diving', also: '', cat: 'life', v: 'avoid', a: 'Decompression can harm the baby. Snorkeling is fine.' },
  { q: 'Lying on your back', also: 'sleeping position side', cat: 'life', v: 'limit',
    a: 'From the second half of pregnancy, sleeping on your side is better for blood flow. Waking up on your back is nothing to worry about: just turn over.' },
  { q: 'Flying', also: 'airplane travel trip', cat: 'life', v: 'ok',
    a: 'Usually fine until about 36 weeks. Walk around, drink water and wear compression socks on long flights. Check where you\'re going for Zika or other outbreaks (CDC).' },
  { q: 'Seat belts', also: 'car driving', cat: 'life', v: 'ok', a: 'Always. The lap belt goes under the bump, across the hips; the shoulder belt between the breasts.' },
  { q: 'Cat litter', also: 'cats toxoplasmosis pets', cat: 'life', v: 'avoid', a: 'Let someone else change it: it can carry toxoplasmosis. If you must, wear gloves and wash your hands.' },
  { q: 'Gardening', also: 'soil yard', cat: 'life', v: 'ok', a: 'Wear gloves (soil can carry toxoplasmosis) and wash your hands after.' },
  { q: 'Hair dye', also: 'highlights bleach perm', cat: 'life', v: 'ok', a: 'Little gets into the body. Many wait until after the first trimester; use a well-ventilated room.' },
  { q: 'Nail salons', also: 'manicure pedicure polish', cat: 'life', v: 'ok', a: 'Fine. Choose a well-ventilated salon.' },
  { q: 'Painting and renovating', also: 'paint fumes sanding lead', cat: 'life', v: 'limit',
    a: 'Modern water-based paint in a ventilated room is low-risk. Stay away from sanding or stripping old paint (lead) and solvent fumes.' },
  { q: 'Cleaning products', also: 'bleach chemicals', cat: 'life', v: 'limit', a: 'Ventilate, wear gloves, and never mix bleach with ammonia or acids.' },
  { q: 'Dental work and X-rays', also: 'dentist cleaning filling', cat: 'life', v: 'ok', a: 'Safe and recommended (ACOG): cleanings, dental X-rays with a shield, fillings and numbing.' },
  { q: 'Massage', also: 'prenatal massage', cat: 'life', v: 'ok', a: 'Fine with a therapist trained in prenatal massage.' },
  { q: 'Sex', also: 'intercourse orgasm', cat: 'life', v: 'ok', a: 'Safe in a healthy pregnancy. Your provider will say if you should wait, for example with placenta previa or bleeding.' },
  { q: 'Roller coasters', also: 'amusement park rides', cat: 'life', v: 'avoid', a: 'Sudden starts, stops and jolts can harm the placenta. Parks post warnings for pregnant riders.' },
  { q: 'Sunscreen and bug spray', also: 'deet mosquito repellent', cat: 'life', v: 'ok', a: 'Both are fine, including DEET, and worth using where mosquitoes carry disease.' },
  { q: 'Heavy lifting', also: 'carrying toddler moving', cat: 'life', v: 'limit', a: 'Lift with your legs, avoid straining, and ask about limits as pregnancy goes on, especially at work.' },
];

// The answers matching a search, best first: whole-word matches in what's asked about, then anywhere.
function safeSearch(text, cat) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  const pool = SAFE.filter(s => !cat || s.cat === cat);
  if (!words.length) return pool;
  const score = s => {
    const q = s.q.toLowerCase(), all = `${q} ${s.also}`.toLowerCase();
    if (!words.every(w => all.includes(w))) return 0;
    return words.reduce((n, w) => n + (q.includes(w) ? 2 : 1), 0);
  };
  return pool.map(s => [score(s), s]).filter(([n]) => n).sort((a, b) => b[0] - a[0]).map(([, s]) => s);
}
