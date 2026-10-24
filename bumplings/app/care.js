// Bumplings: the usual US prenatal care schedule (ACOG, CDC), the things to get ready, the hospital bag, and
// when to call. Weeks are counted from the last period, like WEEKS. Each item shows on the checklist with
// the real dates its window falls on, and a reminder goes out as the window opens.
//   id, emoji, title, from, to (weeks; to is the last whole week), kind: test | shot | visit | ready,
//   what (one or two lines), optional: true when it's a choice, when: a condition (see careFor in logic.js)
const CARE = [
  { id: 'vitamin', emoji: '💊', title: 'Prenatal vitamin with folic acid', from: 4, to: 40, kind: 'ready',
    what: 'Every day, all pregnancy: at least 400 mcg of folic acid (it lowers the chance of neural tube defects) and iron. Tick it once it\'s a habit.' },
  { id: 'first', emoji: '🩺', title: 'First prenatal visit', from: 8, to: 12, kind: 'visit',
    what: 'Health history, blood tests (blood type, iron, immunity, infections), a urine test, and often an ultrasound to confirm the due date.' },
  { id: 'carrier', emoji: '🧬', title: 'Carrier screening', from: 8, to: 13, kind: 'test', optional: true,
    what: 'A blood test showing whether a parent carries genes for conditions like cystic fibrosis or spinal muscular atrophy.' },
  { id: 'nipt', emoji: '🧪', title: 'Cell-free DNA screening (NIPT)', from: 10, to: 20, kind: 'test', optional: true,
    what: 'A blood test that screens for Down syndrome and some other chromosome conditions. It can also tell you the sex.' },
  { id: 'nt', emoji: '🖥️', title: 'Nuchal translucency ultrasound', from: 11, to: 13, kind: 'test', optional: true,
    what: 'An ultrasound (often with a blood test) between 11 weeks and 13 weeks 6 days, screening for chromosome and heart conditions.' },
  { id: 'aspirin', emoji: '💊', title: 'Ask about low-dose aspirin', from: 12, to: 16, kind: 'visit',
    what: 'Recommended from 12 weeks for anyone at high risk of preeclampsia (for example high blood pressure, diabetes, twins, or preeclampsia before). Only on your provider\'s advice.' },
  { id: 'dentist', emoji: '🦷', title: 'Dental checkup', from: 14, to: 27, kind: 'ready',
    what: 'Cleanings, X-rays with a shield and needed treatment are safe in pregnancy, and gum disease is more common.' },
  { id: 'quad', emoji: '🧪', title: 'Quad screen', from: 15, to: 22, kind: 'test', optional: true,
    what: 'A blood test for chromosome conditions and neural tube defects, for those who didn\'t have cell-free DNA screening.' },
  { id: 'anatomy', emoji: '🖥️', title: 'Anatomy ultrasound', from: 18, to: 22, kind: 'test',
    what: 'The detailed scan: heart, brain, spine, organs, growth, placenta and fluid. The sex can usually be seen too.' },
  { id: 'glucose', emoji: '🥤', title: 'Glucose screening', from: 24, to: 28, kind: 'test',
    what: 'A sweet drink, then a blood test an hour later, checking for gestational diabetes.' },
  { id: 'tdap', emoji: '💉', title: 'Tdap (whooping cough) vaccine', from: 27, to: 36, kind: 'shot',
    what: 'Every pregnancy, ideally early in this window. The antibodies protect the baby until they can be vaccinated.' },
  { id: 'rhogam', emoji: '💉', title: 'Rh immune globulin', from: 28, to: 28, kind: 'shot', when: 'rhneg',
    what: 'For an Rh-negative blood type: stops the body making antibodies against an Rh-positive baby. It\'s also needed within 72 hours of any bleeding, a fall or blow to the belly, amniocentesis or CVS, or turning the baby by hand, and after the birth if the baby is Rh-positive: call your provider if one of these happens.' },
  { id: 'kicks', emoji: '👣', title: 'Start paying attention to movements', from: 28, to: 42, kind: 'visit',
    what: 'Once a day, count kicks at a time the baby is usually active. Call if movements slow down or change.' },
  { id: 'rsv', emoji: '💉', title: 'RSV vaccine', from: 32, to: 36, kind: 'shot', when: 'rsv',
    what: 'Given at 32 to 36 weeks between September and January. Or the baby gets an RSV antibody shot after birth instead: ask which.' },
  { id: 'gbs', emoji: '🧫', title: 'Group B strep test', from: 36, to: 37, kind: 'test',
    what: 'A quick swab. If positive, antibiotics during labor protect the baby.' },
  { id: 'position', emoji: '🔄', title: 'Check the baby is head-down', from: 36, to: 37, kind: 'visit',
    what: 'If the baby is breech, ask about turning them (external version) or the birth plan.' },
  { id: 'induction', emoji: '📅', title: 'Plan for after the due date', from: 39, to: 40, kind: 'visit',
    what: 'Ask about the plan if labor hasn\'t started: induction between 39 and 42 weeks, and extra checks after 41.' },
  { id: 'flu', emoji: '💉', title: 'Flu vaccine', from: 4, to: 40, kind: 'shot', when: 'flu',
    what: 'Recommended in any trimester during flu season (fall and winter). It protects the baby for months after birth too.' },
  { id: 'covid', emoji: '💉', title: 'Ask about the COVID-19 vaccine', from: 4, to: 40, kind: 'shot', optional: true,
    what: 'ACOG recommends it during pregnancy; ask your provider about the current vaccine.' },

  // Getting ready
  { id: 'leave', emoji: '💼', title: 'Look into parental leave', from: 12, to: 24, kind: 'ready',
    what: 'Both of you: employer policy, FMLA (give 30 days\' notice when you can), short-term disability and state paid leave.' },
  { id: 'insurance', emoji: '🧾', title: 'Check what insurance covers', from: 12, to: 24, kind: 'ready',
    what: 'Your hospital and doctors in network, the deductible, and how to add the baby (usually within 30 days of birth).' },
  { id: 'registry', emoji: '🛒', title: 'Make a baby list', from: 16, to: 28, kind: 'ready',
    what: 'Car seat, safe sleep space, diapers, a few outfits, feeding things. Less than ads suggest.' },
  { id: 'classes', emoji: '🎓', title: 'Sign up for classes', from: 22, to: 30, kind: 'ready',
    what: 'Childbirth, breastfeeding or formula feeding, newborn care and infant CPR. Take them together.' },
  { id: 'pediatrician', emoji: '👩‍⚕️', title: 'Choose a pediatrician', from: 28, to: 34, kind: 'ready',
    what: 'The baby\'s first checkup is a few days after birth. Many practices do a free visit to meet them before.' },
  { id: 'tour', emoji: '🏥', title: 'Tour and pre-register at the hospital', from: 28, to: 34, kind: 'ready',
    what: 'Know which entrance to use at night, where to park, and get the paperwork done ahead.' },
  { id: 'helpers', emoji: '🧸', title: 'Plan care for other kids and pets', from: 30, to: 35, kind: 'ready',
    what: 'Who comes, day or night, when labor starts, and a backup.' },
  { id: 'birthplan', emoji: '📝', title: 'Write your birth preferences', from: 30, to: 35, kind: 'ready',
    what: 'Pain relief, who\'s in the room, skin-to-skin, feeding, and newborn care. Fill in 📝 Birth plan together and go over it at a visit.' },
  { id: 'carseat', emoji: '🚗', title: 'Install the car seat and get it checked', from: 33, to: 36, kind: 'ready',
    what: 'Rear-facing, in the back seat. Free checks: search "car seat inspection" with NHTSA or ask the hospital.' },
  { id: 'bag', emoji: '🎒', title: 'Pack the hospital bags', from: 34, to: 36, kind: 'ready',
    what: 'One for the birth, one for the partner, and the baby\'s going-home things. See 🎒 Hospital bag.' },
  { id: 'sleep', emoji: '🛏️', title: 'Set up a safe sleep space', from: 34, to: 37, kind: 'ready',
    what: 'A crib or bassinet with a firm, flat mattress and a fitted sheet, nothing else, in your room. Baby always sleeps on their back.' },
  { id: 'meals', emoji: '🍲', title: 'Stock the freezer and pantry', from: 34, to: 38, kind: 'ready',
    what: 'Easy meals and snacks for the first weeks, and a list of people who offered to help.' },
  { id: 'postpartum', emoji: '🤱', title: 'Plan for the weeks after birth', from: 32, to: 38, kind: 'ready',
    what: 'Who helps, who does nights, and a postpartum checkup within 3 weeks of the birth. Know the signs of postpartum depression.' },
];

// After the birth: the jobs and checkups of the first six months, for the baby (AAP Bright Futures, CDC) and
// for the one who gave birth (ACOG). days: [first, last] counted from the birth day (day 0).
const AFTER = [
  { id: 'pp-hepb', emoji: '💉', title: 'Hepatitis B vaccine and newborn screening', days: [0, 2], what: 'Done at the hospital: the heel-prick blood test, a hearing check and the first hepatitis B shot, which the AAP recommends within 24 hours of birth for every baby (federal advice changed in 2025 for babies of mothers who tested negative: ask the pediatrician). Ask for the results at the first visit.' },
  { id: 'pp-rsv', emoji: '💉', title: 'Ask about the RSV antibody for the baby', days: [0, 7], what: 'Unless mom had the RSV vaccine at least 2 weeks before the birth, babies born October to March get an RSV antibody shot (nirsevimab or clesrovimab) in their first week, and babies born April to September get it as RSV season starts in the fall.' },
  { id: 'pp-ped', emoji: '👶', title: 'First pediatrician visit', days: [2, 5], what: 'Usually 1 to 2 days after you get home: weight, jaundice and feeding.' },
  { id: 'pp-ins', emoji: '🧾', title: 'Add the baby to your insurance', days: [0, 30], what: 'Most plans give you 30 days from the birth.' },
  { id: 'pp-papers', emoji: '📄', title: 'Birth certificate and Social Security number', days: [0, 14], what: 'Usually started at the hospital. Check you get both.' },
  { id: 'pp-check', emoji: '🩺', title: 'Postpartum check-in with your provider', days: [7, 21], what: 'ACOG advises contact within 3 weeks of the birth: blood pressure, healing, feeding and mood. Sooner with high blood pressure.' },
  { id: 'pp-mood', emoji: '💛', title: 'Check in on moods, both of you', days: [10, 60], what: 'Baby blues fade within two weeks. Sadness, anxiety or numbness that lasts longer is common and treatable, in partners too: use 💛 Mood check, and call.' },
  { id: 'pp-1mo', emoji: '👶', title: '1-month checkup', days: [25, 35], what: 'Growth, feeding and sleep. Bring your questions and the 🍼 Baby log.' },
  { id: 'pp-full', emoji: '🩺', title: 'Full postpartum visit', days: [28, 84], what: 'By 12 weeks (ACOG): recovery, mood, birth control, sleep, pelvic floor, and any conditions from pregnancy like high blood pressure or gestational diabetes.' },
  { id: 'pp-2mo', emoji: '💉', title: '2-month checkup and vaccines', days: [56, 66], what: 'The first big round of vaccines. Acetaminophen afterwards only if the pediatrician says so.' },
  { id: 'pp-floor', emoji: '🧘', title: 'Pelvic floor and getting active again', days: [42, 120], what: 'Leaking, pain or pressure is common but not something to live with: ask about pelvic floor physical therapy.' },
  { id: 'pp-4mo', emoji: '💉', title: '4-month checkup and vaccines', days: [115, 128], what: 'Vaccines, growth, and when to think about solid foods (usually around 6 months).' },
  { id: 'pp-6mo', emoji: '💉', title: '6-month checkup and vaccines', days: [175, 190], what: 'Vaccines, starting solids, and a flu shot for the baby in season.' },
];

// When to call about the baby (AAP).
const WARN_BABY = {
  now: ['Trouble breathing, grunting with each breath, or blue or gray lips', 'Limp, or very hard to wake', 'A seizure'],
  call: [
    'A temperature of 100.4°F (38°C) or higher taken in the bottom, under 3 months old: call right away, day or night',
    'Not feeding, or too sleepy to feed',
    'Fewer wet diapers than expected (see 🍼 Baby log), or dark urine',
    'Yellow skin or eyes that is spreading or getting deeper',
    'Vomiting with force, green vomit, or vomiting every feed',
    'Redness, swelling or pus around the umbilical cord stump',
    'Crying that won\'t stop and doesn\'t seem like your baby',
  ],
};

// The birth plan: preferences to talk over at a visit and bring to the hospital. Each section is choices to
// tick and a note. A plan is preferences, not promises: things can change for the baby's or mom's safety.
const PLAN = [
  { id: 'people', title: '👪 With me', opts: ['My partner', 'A doula', 'A family member', 'A friend', 'As few people in the room as possible', 'OK with students or residents'] },
  { id: 'room', title: '🕯️ During labor', opts: ['Dim lights', 'My own music', 'Quiet, please', 'Free to walk and move', 'Birth ball', 'Shower or tub', 'Light snacks and drinks if allowed', 'My own clothes'] },
  { id: 'pain', title: '💆 Pain relief', opts: ['Epidural as soon as I can', 'Epidural only if I ask', 'Nitrous oxide', 'IV pain medicine', 'Unmedicated: please don\'t offer', 'Tell me all my options', 'Breathing, massage, counter-pressure', 'Warm water'] },
  { id: 'care', title: '🩺 Monitoring and interventions', opts: ['Intermittent monitoring if possible', 'Saline lock instead of a running IV if possible', 'Ask me before breaking my water', 'Ask me before Pitocin', 'No episiotomy unless needed', 'Explain any procedure before it happens'] },
  { id: 'birth', title: '👶 Pushing and birth', opts: ['Push in positions I choose', 'Push when I feel the urge', 'A mirror to see', 'Partner announces the sex', 'Partner cuts the cord', 'Delayed cord clamping', 'Cord blood banking', 'Keep the placenta'] },
  { id: 'csec', title: '🏥 If a C-section is needed', opts: ['Partner with me', 'Clear drape to watch the birth', 'Skin-to-skin in the operating room', 'Talk me through it', 'My own music', 'Baby stays with my partner'] },
  { id: 'baby', title: '🍼 Baby\'s first hours', opts: ['Skin-to-skin right away', 'Delay the first bath', 'Weigh and measure after the first hour', 'Vitamin K shot', 'Eye ointment', 'Hepatitis B vaccine', 'Baby rooms in with me', 'Circumcision', 'No circumcision'] },
  { id: 'feed', title: '🤱 Feeding', opts: ['Breastfeeding', 'Formula', 'Both', 'See a lactation consultant', 'No pacifier unless needed', 'No formula unless medically needed'] },
  { id: 'other', title: '📝 Anything else', opts: [] },
];

// Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987): ten questions about the past 7 days,
// each answer scored 0 to 3. Validated for pregnancy and after, and for partners too. It is a screen, not a
// diagnosis.
const EPDS = [
  ['I have been able to laugh and see the funny side of things', ['As much as I always could', 'Not quite so much now', 'Definitely not so much now', 'Not at all'], [0, 1, 2, 3]],
  ['I have looked forward with enjoyment to things', ['As much as I ever did', 'Rather less than I used to', 'Definitely less than I used to', 'Hardly at all'], [0, 1, 2, 3]],
  ['I have blamed myself unnecessarily when things went wrong', ['Yes, most of the time', 'Yes, some of the time', 'Not very often', 'No, never'], [3, 2, 1, 0]],
  ['I have been anxious or worried for no good reason', ['No, not at all', 'Hardly ever', 'Yes, sometimes', 'Yes, very often'], [0, 1, 2, 3]],
  ['I have felt scared or panicky for no very good reason', ['Yes, quite a lot', 'Yes, sometimes', 'No, not much', 'No, not at all'], [3, 2, 1, 0]],
  ['Things have been getting on top of me', ['Yes, most of the time I haven\'t been able to cope at all', 'Yes, sometimes I haven\'t been coping as well as usual', 'No, most of the time I have coped quite well', 'No, I have been coping as well as ever'], [3, 2, 1, 0]],
  ['I have been so unhappy that I have had difficulty sleeping', ['Yes, most of the time', 'Yes, sometimes', 'Not very often', 'No, not at all'], [3, 2, 1, 0]],
  ['I have felt sad or miserable', ['Yes, most of the time', 'Yes, quite often', 'Not very often', 'No, not at all'], [3, 2, 1, 0]],
  ['I have been so unhappy that I have been crying', ['Yes, most of the time', 'Yes, quite often', 'Only occasionally', 'No, never'], [3, 2, 1, 0]],
  ['The thought of harming myself has occurred to me', ['Yes, quite often', 'Sometimes', 'Hardly ever', 'Never'], [3, 2, 1, 0]],
];

// Blood sugar goals with gestational diabetes (ACOG): fasting under 95 mg/dL, under 140 one hour after a
// meal, or under 120 two hours after.
const GLUCOSE = { fast: 95, 1: 140, 2: 120 };
const MEALS = [['fast', 'Fasting'], ['b', 'Breakfast'], ['l', 'Lunch'], ['d', 'Dinner']];

// The hospital bags. list: mom | partner | baby
const BAG = [
  { id: 'id', list: 'mom', label: 'ID, insurance card and hospital papers' },
  { id: 'prefs', list: 'mom', label: 'Birth preferences (printed or on phone)' },
  { id: 'meds', list: 'mom', label: 'Any medicines you take' },
  { id: 'glasses', list: 'mom', label: 'Glasses or contact lens case' },
  { id: 'robe', list: 'mom', label: 'Robe and comfy socks or slippers' },
  { id: 'nursing', list: 'mom', label: 'Nursing bra or tops' },
  { id: 'underwear', list: 'mom', label: 'High-waisted underwear (or disposable)' },
  { id: 'pads', list: 'mom', label: 'Extra-absorbent pads (the hospital gives some)' },
  { id: 'toiletries', list: 'mom', label: 'Toiletries, lip balm, hair ties' },
  { id: 'charger', list: 'mom', label: 'Phone charger with a long cable' },
  { id: 'homeclothes', list: 'mom', label: 'Loose clothes to go home in' },
  { id: 'pillow', list: 'mom', label: 'Your own pillow (bright pillowcase)' },
  { id: 'p-clothes', list: 'partner', label: 'Change of clothes and a sweater' },
  { id: 'p-toiletries', list: 'partner', label: 'Toothbrush and toiletries' },
  { id: 'p-snacks', list: 'partner', label: 'Snacks and a water bottle for both of you' },
  { id: 'p-charger', list: 'partner', label: 'Phone charger and battery pack' },
  { id: 'p-cash', list: 'partner', label: 'Cash or card for parking and vending machines' },
  { id: 'p-list', list: 'partner', label: 'List of people to call' },
  { id: 'p-music', list: 'partner', label: 'Speaker or playlist' },
  { id: 'b-carseat', list: 'baby', label: 'Car seat, installed in the car' },
  { id: 'b-outfit', list: 'baby', label: 'Going-home outfit (newborn and 0–3 months)' },
  { id: 'b-hat', list: 'baby', label: 'Hat and socks' },
  { id: 'b-blanket', list: 'baby', label: 'A warm blanket for the ride home' },
  { id: 'b-diapers', list: 'baby', label: 'A few newborn diapers and wipes' },
];
const BAG_LISTS = [['mom', 'For the birth'], ['partner', 'For the partner'], ['baby', 'For the baby']];

// When to get help. From CDC "Hear Her" urgent maternal warning signs and ACOG.
const WARN = {
  now: ['Thoughts of hurting yourself or the baby', 'Chest pain or a fast-beating heart', 'Trouble breathing', 'A seizure'],
  call: [
    'A headache that won\'t go away or gets worse',
    'Changes in vision: blurring, spots or flashing lights',
    'Fever of 100.4°F (38°C) or higher',
    'Sudden or extreme swelling of the face or hands',
    'A red, painful, swollen leg, usually just one (a possible clot)',
    'Bad belly pain that doesn\'t go away',
    'The baby moving less, or stopping',
    'Bleeding, or fluid leaking from the vagina',
    'Throwing up so much you can\'t keep fluids down',
    'Dizziness or fainting',
    'Blood pressure of 140/90 or higher',
    'Extreme tiredness, or feeling hopeless or overwhelmed',
  ],
  preterm: [
    'Tightening or contractions that come regularly, 4 or more an hour',
    'A dull, low backache that comes and goes',
    'Pressure in the pelvis, like the baby is pushing down',
    'Cramps like a period, with or without diarrhea',
    'A change in discharge: watery, mucus or bloody',
  ],
  labor: [
    'Contractions that are regular and getting closer, longer and stronger (see ⏱ Contractions)',
    'Water breaking: note the Time, Amount, Color and Odor, and call',
    'Bright red bleeding like a period',
    'Constant, severe pain with no break between contractions',
  ],
  after: [
    'Bleeding that soaks a pad in an hour, or clots bigger than an egg',
    'A red, painful, swollen leg (a possible clot)',
    'An incision that is red, swollen or oozing',
    'Fever, or a hot, red, painful area on a breast',
    'Sadness, anxiety or numbness lasting more than two weeks',
  ],
};

const SYMPTOMS = ['Nausea', 'Tired', 'Heartburn', 'Headache', 'Back ache', 'Swelling', 'Cramps', 'Can\'t sleep', 'Braxton Hicks', 'Constipation', 'Dizzy', 'Spotting'];
const MOODS = [['😄', 'Great'], ['🙂', 'Good'], ['😐', 'Okay'], ['😟', 'Low'], ['😢', 'Struggling']];

// How much weight gain is usual, by pre-pregnancy BMI (Institute of Medicine 2009): the total, and the
// weekly rate in the second and third trimesters, in pounds. The first trimester adds 1.1 to 4.4 lb.
const GAIN = [
  { upTo: 18.5, name: 'underweight', total: [28, 40], rate: [1, 1.3] },
  { upTo: 25, name: 'healthy weight', total: [25, 35], rate: [0.8, 1] },
  { upTo: 30, name: 'overweight', total: [15, 25], rate: [0.5, 0.7] },
  { upTo: Infinity, name: 'obesity', total: [11, 20], rate: [0.4, 0.6] },
];

const ASK_DOCTOR = 'Bumplings is general information, not medical advice, and every pregnancy is different. Your doctor or midwife knows yours: when they say something different, follow them. If something feels wrong, call. You\'re never bothering them.';
const SOURCES = [
  'American College of Obstetricians and Gynecologists (ACOG): prenatal care, screening, vaccines, labor and postpartum guidance',
  'CDC: Hear Her urgent maternal warning signs; vaccines during pregnancy (Tdap, flu, RSV)',
  'Institute of Medicine (2009): weight gain during pregnancy',
  'U.S. Preventive Services Task Force: low-dose aspirin to prevent preeclampsia; folic acid',
  'American Academy of Pediatrics: safe sleep, newborn care, feeding and diapers, Bright Futures checkup schedule',
  'Edinburgh Postnatal Depression Scale: J. L. Cox, J. M. Holden, R. Sagovsky, British Journal of Psychiatry, 1987',
  'FDA: NSAIDs after 20 weeks; food safety for pregnant women',
  'MotherToBaby (Organization of Teratology Information Specialists): medicines in pregnancy',
  'NHTSA: car seat installation and inspection',
  'FDA/EPA: advice about eating fish in pregnancy',
];
