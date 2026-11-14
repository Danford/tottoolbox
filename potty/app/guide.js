// Tot Potty's content: the signs of readiness, the three approaches with their steps, a tip a day, the guides
// for when it's hard, when to call the doctor, nights, and the things that help. From the American Academy of
// Pediatrics (HealthyChildren.org), the NHS, and the research in SOURCES. `{name}` is the child's name, and
// `{pee}`, `{poop}` and `{potty}` the child's own words for them (app.js fills them in).

// Signs a child may be ready, in three groups: the body, understanding, and wanting to.
const READY = [
  { id: 'dry2', group: 'Body', text: 'Stays dry for 2 hours or more, or wakes from a nap dry' },
  { id: 'regular', group: 'Body', text: 'Poops at fairly regular times, and they\'re soft' },
  { id: 'walk', group: 'Body', text: 'Walks to the potty and sits down steadily' },
  { id: 'pants', group: 'Body', text: 'Can pull pants down and up, or nearly' },
  { id: 'follow', group: 'Understanding', text: 'Follows two-step directions ("Get your shoes and bring them here")' },
  { id: 'words', group: 'Understanding', text: 'Has words or signs for pee and poop' },
  { id: 'aware', group: 'Understanding', text: 'Shows they\'re going: goes quiet, squats, hides, or tells you after' },
  { id: 'wetfeel', group: 'Understanding', text: 'Notices or complains about a wet or dirty diaper' },
  { id: 'curious', group: 'Wanting to', text: 'Is curious about the toilet, or follows grown-ups into the bathroom' },
  { id: 'undies', group: 'Wanting to', text: 'Is interested in underwear, or in being a "big kid"' },
  { id: 'myself', group: 'Wanting to', text: 'Wants to do things "by myself"' },
  { id: 'calm', group: 'Wanting to', text: 'Isn\'t in a phase of saying no to everything' },
  { id: 'time', group: 'Wanting to', text: 'Life is calm for the next few weeks: no new sibling, move or new daycare' },
];
const READY_WORDS = {
  early: 'Under 18 months, the muscles that hold pee and poop usually aren\'t under control yet. Reading potty books and letting {name} see the toilet used now helps later; the real start is usually somewhere between 2 and 3.',
  ready: '{name} shows most of the signs. A good time to start, on a calm stretch of days.',
  soon: '{name} shows some of the signs. Get ready: a potty in the bathroom, potty books, sitting dressed for fun. Check again in a few weeks.',
  notyet: 'Not many signs yet, and that\'s normal: most children are ready between 2 and 3. Starting before a child is ready tends to make training take longer, not finish sooner. Check again in a month or two.',
};

// The approaches. `byDay`: the stages follow the days from the start date; otherwise the grown-up moves on when
// the stage's goal is met. Each stage: {id, title, days (byDay only), timer (minutes for the potty timer, 0 for
// none), goal, check (optional: what the app counts toward the goal, below), tasks: [id, text, kind], tip}.
// A task's kind: none, it stays ticked; 'day', it's for today and clears overnight; 'refill', it clears when an
// accident is logged away from home (the spare clothes got used). `check`: {by, need} counts the last 7 days:
// 'sat' days with a sit or a pee or poop in the potty, 'win' days with a pee or poop in the potty, 'dry' days
// with something in the potty and no accident; `need` of them says the goal looks met.
const METHODS = {
  three: {
    name: '3-day method', emoji: '🚀', byDay: true,
    blurb: 'Three days at home, all in: no diapers in the daytime, frequent tries, close watching. Then out and about. Fast, but intense for everyone.',
    fits: 'Best from about 2½, when {name} shows most of the signs and you can clear three days at home. Research finds no gain from intensive training much before that.',
    prep: [['gear', 'Get the gear: a potty (or a seat and step stool), 10 to 15 pairs of underwear, easy pants'], ['calendar', 'Clear three days at home, with no outings planned'],
      ['books', 'Read a potty book together for a week or so before'], ['drinks', 'Have {name}\'s favorite drinks and juicy fruit ready to offer'],
      ['floor', 'Roll up the rugs; old towels and a cleaning spray within reach'], ['prize', 'Choose stickers and a prize (Stickers in the menu)']],
    stages: [
      { id: 'd1', title: 'Day 1: Bare bottom at home', days: 1, timer: 20, goal: 'Get as many pees as you can into the {potty}, even if they start on the floor.',
        tasks: [['bye', 'Say goodbye to the diapers together, and show the new underwear'], ['bare', 'Bare bottom (just a t-shirt) all day at home, potty close by'],
          ['drink', 'Offer drinks often (more drinks, more practice), but never push more than {name} wants'], ['watch', 'Watch {name}, not your phone: wiggling, crossing legs, going quiet'],
          ['rush', 'At the first sign of a pee, even mid-stream, calmly scoop {name} up and onto the {potty}'], ['night', 'A diaper or pull-up only for nap and night']],
        tip: 'Expect lots of accidents today. They\'re how {name} learns what the feeling means. Stay calm, say "{pee} goes in the {potty}", and finish on the {potty}.' },
      { id: 'd2', title: 'Day 2: Pants on, nothing under', days: 1, timer: 30, goal: 'More pees in the {potty} than not.',
        tasks: [['pants', 'Loose pants with nothing under them for now: snug underwear feels like a diaper to some children'], ['every30', 'Try every 30 minutes, and on waking, after meals and before going out'],
          ['wait', 'Before reminding, now and then wait: "What does your body say?"'], ['outing', 'A short outing (15 to 30 minutes) just after a {pee}, with a travel potty']],
        tip: 'Some children "hold it" on day 2, then go the moment they\'re back in a diaper. Offer drinks, relaxed sits with a book, and keep the diaper off in the day.' },
      { id: 'd3', title: 'Day 3: Out and about', days: 1, timer: 45, goal: 'Dry through an outing.',
        tasks: [['undies', 'Underwear, or still nothing under the pants if that\'s working'], ['every45', 'Try every 45 minutes'],
          ['longer', 'A longer outing: a try before you go, when you arrive, and before you leave'], ['where', 'Show {name} where the toilet is anywhere new']],
        tip: 'Public toilets are loud and big. A folding seat, a sticky note over an automatic flush sensor, and holding {name} steady all help.' },
      { id: 'd4', title: 'Days 4 to 14: Steady', days: 11, timer: 60, goal: 'Mostly dry days, with the timer stretched to an hour or more.', check: { by: 'dry', need: 5 },
        tasks: [['stretch', 'Stretch the timer as trips succeed (Progress suggests a time)'], ['same', 'The same words and routine everywhere: give sitters and daycare the handoff note'],
          ['spare', 'Spare clothes in the bag (two sets for daycare). Pack again after an accident', 'refill'], ['calm', 'Stay calm about accidents: when tired, busy or excited, they still happen']],
        tip: 'Many children get the idea within days. Being reliable takes longer, often weeks to a few months. A bad day now isn\'t starting over.' },
      { id: 'd5', title: 'After two weeks: {name} leads', days: 999, timer: 0, goal: 'The goal: {name} asks to go most of the time.',
        tasks: [['timeroff', 'Turn the timer off once {name} asks for most trips'], ['anchors', 'Today\'s sits: on waking, before nap and bed, and before going out', 'day'],
          ['nights', 'Nights come later, on their own: see Nights']],
        tip: 'Asking comes last. Until then, the reminders do the work: that\'s normal, not a failure.' },
    ],
  },
  gentle: {
    name: 'Child-led, step by step', emoji: '🌱', byDay: false,
    blurb: 'Dr. Brazelton\'s step-by-step approach, which the American Academy of Pediatrics\' advice builds on: small steps, at {name}\'s pace, moving on when {name} is ready. Calm, and takes weeks to months.',
    fits: 'Fits any child from about 18 months, and a child who resists pressure. Diapers stay on for outings until Step 5.',
    prep: [['potty', 'A potty in the bathroom (or where {name} plays), or a seat and a step stool'], ['books', 'A potty book or two (see Gear)']],
    stages: [
      { id: 's1', title: 'Step 1: Meet the potty', timer: 0, goal: 'Move on when {name} happily sits on the {potty} dressed, most days for a week or two.',
        tasks: [['sitdressed', 'Today\'s sit: on the {potty} with clothes on, for a story', 'day'], ['watch', 'Let {name} see grown-ups or older children use the toilet'],
          ['words', 'Name it as it happens: "You\'re doing a {poop}"'], ['book', 'Read a potty book together']],
        tip: 'There\'s no rush in this step. Make the {potty} a nice, ordinary place: a chair with a book. {name} can get up whenever they like.' },
      { id: 's2', title: 'Step 2: Bare-bottom sits', timer: 0, goal: 'Move on when {name} sits two or three times a day without a fuss, most days for about a week. A pee or poop in the {potty} is a bonus, not a must.', check: { by: 'sat', need: 5 },
        tasks: [['wake', 'A sit on waking, diaper off', 'day'], ['meals', 'A sit after a meal (eating gets poop moving)', 'day'],
          ['bath', 'A sit before the bath or bed', 'day'], ['short', 'Keep each sit short: a song or two, then up, whatever happened']],
        tip: 'Praise the sitting, not just the result. "You sat on the {potty} like a big kid!" Log each sit (Sat, nothing) so the week counts up here.' },
      { id: 's3', title: 'Step 3: Show where poop goes', timer: 0, goal: 'Move on when {name} knows that {pee} and {poop} go in the {potty}.',
        tasks: [['sits', 'Keep up the sits from Step 2', 'day'], ['empty', 'After a poopy diaper, tip the poop into the {potty} or toilet together', 'day'],
          ['flush', 'Let {name} flush and wave bye-bye (if the noise is OK)'], ['change', 'Change diapers in the bathroom, standing up']],
        tip: 'Some children are upset to see their poop flushed away. Waving bye-bye, or flushing after they\'ve left the room, helps.' },
      { id: 's4', title: 'Step 4: Diaper-free time', timer: 90, goal: 'Move on when most pees land in the {potty} during diaper-free time.',
        tasks: [['free', 'Time at home with a bare bottom or underwear today, potty nearby: start short, build to a few hours', 'day'], ['remind', 'A gentle reminder every hour or two (the timer)'],
          ['signs', 'Watch for the signs and go together'], ['calmacc', 'Accidents: calm, a quick change, a sit on the {potty}']],
        tip: 'Underwear that {name} chose (a favorite character) is a reason to keep it dry.' },
      { id: 's5', title: 'Step 5: Underwear by day', timer: 60, goal: 'Move on when most days are dry.', check: { by: 'dry', need: 5 },
        tasks: [['allday', 'Underwear all day, outings too; a diaper or pull-up for sleep until naps are mostly dry'], ['outings', 'A try before every outing, and a travel potty along', 'day'],
          ['spare', 'Spare clothes in the bag. Pack again after an accident', 'refill'], ['others', 'Give sitters and daycare the handoff note']],
        tip: 'Pull-ups in the day feel just like diapers, so they slow things down. Keep them for sleep.' },
      { id: 's6', title: 'Step 6: {name} leads', timer: 0, goal: 'The goal: {name} asks to go most of the time.',
        tasks: [['timeroff', 'Timer off'], ['anchors', 'Today\'s sits: on waking, before nap and bed, and before outings', 'day'], ['nights', 'Nights come later, on their own: see Nights']],
        tip: 'Keep the praise going, quietly. A dry week deserves a party.' },
    ],
  },
  routine: {
    name: 'Potty at set times', emoji: '🕰️', byDay: false,
    blurb: 'Sits at the same times every day, then by the timer: the habit comes first, the feeling later. Works well with daycare, which often does the same.',
    fits: 'Good when {name} is in daycare, or likes routine. From about 2.',
    prep: [['times', 'Pick your times: waking, after each meal, before and after nap, before bath and bed'], ['tell', 'Tell daycare: they likely use set times too']],
    stages: [
      { id: 'r1', title: 'Step 1: The same times every day', timer: 0, goal: 'Move on when {name} sits at the set times without a fuss, and pees or poops in the {potty} on most days.', check: { by: 'win', need: 4 },
        tasks: [['times', 'Today\'s sits at your set times, diaper off', 'day'], ['two', 'Two or three minutes, with a book or song'], ['log', 'Log what happens: the patterns show when {name} tends to go']],
        tip: 'Many children pee soon after waking, and poop within half an hour or so of a meal.' },
      { id: 'r2', title: 'Step 2: Underwear and the timer', timer: 75, goal: 'Move on when most days have one accident or none.',
        tasks: [['undies', 'Underwear in the day'], ['timer', 'Tries by the timer between the set times', 'day'], ['spare', 'Spare clothes in every bag. Pack again after an accident', 'refill']],
        tip: 'If accidents come just before the timer, shorten it by 10 or 15 minutes: Progress says how often {name} usually goes.' },
      { id: 'r3', title: 'Step 3: Stretch it', timer: 120, goal: 'Move on when {name} starts asking.',
        tasks: [['stretch', 'Stretch the timer by 15 minutes every few dry days'], ['wait', 'Wait a moment before reminding: "What does your body say?"']],
        tip: 'The aim is for {name} to notice the feeling. Being asked less is what makes room for that.' },
      { id: 'r4', title: 'Step 4: {name} leads', timer: 0, goal: 'The goal: {name} asks to go most of the time.',
        tasks: [['timeroff', 'Timer off'], ['anchors', 'Today\'s sits: on waking, before nap and bed, and before outings', 'day'], ['nights', 'Nights come later: see Nights']],
        tip: 'Keep a try before every car trip for a good while yet.' },
    ],
  },
};

// A tip a day, for home.
const TIPS = [
  'Say "It\'s {potty} time", not "Do you need to go?" The answer to a question is usually no.',
  'Feet flat on a stool, knees higher than hips: pooping is easier that way, for grown-ups too.',
  'Blowing bubbles, or pretending to blow out candles, relaxes the muscles that let pee and poop out.',
  'Praise the trying, not just the result: "You listened to your body!"',
  'Water, milk, fruit and vegetables keep poop soft. Hard poop hurts, and then children hold it in.',
  'Accidents are information, not failure. Change {name} calmly, and finish with a sit on the {potty}.',
  'Keep sits short: a minute or two. Long sits feel like a punishment.',
  'Try right after waking and 15 to 30 minutes after meals: that\'s when bodies tend to go.',
  'Underwear {name} picked out is worth keeping dry.',
  'Dress for speed: elastic waists, no overalls or tights for now.',
  'A small step stool and a seat that fits help {name} feel safe on the big toilet.',
  'Before the car, before the park, before nap and bed: always a try.',
  'Siblings and friends are great teachers. Let {name} watch how it\'s done.',
  'Don\'t battle. If it turns into a power struggle, a break of a few weeks often fixes it.',
  'Stickers work best when they\'re earned right away, on the spot.',
  'Let {name} flush, if they like to, and wave bye-bye.',
  'Boys can learn sitting first, for both. Standing comes later, often by copying.',
  'Wipe front to back, and wash hands with soap for as long as it takes to sing the ABCs.',
  'Tell sitters and daycare the same words you use: the handoff note has them.',
  'Pull-ups for nap and night are fine. In the day they feel like diapers and slow things down.',
  'When {name} is sick, tired or upset, more accidents are normal. Back to basics for a few days.',
  'Night dryness can\'t be taught: it comes when the body is ready, often months after the day.',
  'Read a potty book on the potty. It gives a reason to stay a moment longer.',
  'Celebrate milestones out loud: a call to Grandma about the first poop in the potty is a big deal to {name}.',
];

// Guides for when it's hard: {id, emoji, title, sum, parts: [heading, [lines]]}.
const GUIDES = [
  { id: 'start', emoji: '🚦', title: 'When and how to start', sum: 'The age, the signs, and setting things up.', parts: [
    ['When', ['Most children are ready somewhere between 2 and 3. Girls are often ready a few months before boys. In a US study of healthy children, the daytime skills came between about 2 and 3½, girls a little earlier.', 'Starting before a child is ready doesn\'t make it end sooner: it mostly makes it take longer.', 'You don\'t need every sign. The NHS says most children can learn between 18 months and 2½, and a calm start with a few signs is fine.','The Readiness check in the menu goes through the signs.']],
    ['Pick a calm stretch', ['Avoid starting in the weeks around a new baby, a move, a new daycare or a big trip. If one is coming, start a month or two before, or wait until after.']],
    ['Set up', ['A potty, or a child seat on the toilet with a step stool. Easy clothes. A potty book. Stickers if you like them. Then pick an approach in Plan.']],
  ] },
  { id: 'talk', emoji: '💬', title: 'Words, and how to ask', sum: 'What to say, and what not to.', parts: [
    ['Pick the words', ['Choose words for pee, poop and the potty, and have everyone use them (Settings has them, and they\'re in the handoff note). Plain words are best: they work at school too.']],
    ['Tell, don\'t ask', ['"It\'s {potty} time" works better than "Do you need to go?". Toddlers say no to questions.', 'Offer choices instead: "Do you want to walk or hop to the {potty}?"']],
    ['Praise', ['Specific and warm: "You felt it and you went!" For trying too. Keep it calm: big shows can scare some children.']],
  ] },
  { id: 'sitting', emoji: '🪑', title: 'Sitting, and pooping comfortably', sum: 'Feet up, knees up, relax.', parts: [
    ['The position', ['Feet flat on the floor or a stool, knees a little higher than the hips, leaning forward. Dangling legs make it hard to relax enough to poop.']],
    ['Relaxing', ['Blow bubbles or a pinwheel, blow out pretend candles, or "huff like a dragon". A book or a song helps a child stay a minute.', 'The Sit timer in Kid mode plays a song and counts down.']],
    ['How long', ['A minute or two, up to five for a poop. Then up, whatever happened. "Let\'s try again later."']],
  ] },
  { id: 'withhold', emoji: '🙈', title: 'Poop worries', sum: 'Holding it in, hiding, or only pooping in a diaper.', parts: [
    ['It\'s common', ['About one child in five goes through a stretch of only pooping in a diaper, or holding poop in. It usually passes, but pushing makes it last longer.']],
    ['What helps', ['First, make sure poop is soft and doesn\'t hurt (see Constipation). Pain is the most common reason children hold it.', 'Let {name} ask for a diaper to poop in: better than holding it. Then, step by step: poop in the diaper in the bathroom, then sitting on the {potty} in the diaper, then with a hole cut in it, then without.', 'Sit after meals, with feet on a stool and a book. No pressure, no long sits.', 'Praise any step forward.']],
    ['See the doctor if', ['It goes on for more than a few weeks, poop hurts or is very hard or large, or there\'s blood or soiling in underwear.']],
  ] },
  { id: 'constipation', emoji: '🍐', title: 'Constipation', sum: 'Hard poop, fewer poops, and holding it.', parts: [
    ['Signs', ['Fewer than three poops a week; hard, dry or very large poops; pain or crying when pooping; streaks of blood; holding it (stiff legs, tiptoes, hiding in a corner); runny poop leaking into underwear (from around a hard lump).']],
    ['What helps', ['Water through the day; fruits like pears, prunes, plums and berries; vegetables, beans and whole grains.', 'Cut back on a lot of milk and cheese if they fill {name} up.', 'Running about, and a relaxed sit after meals with feet up.']],
    ['Ask the doctor', ['About constipation that lasts more than two weeks, or any time it hurts a lot, there\'s blood, a swollen belly, or vomiting. Don\'t give laxatives or suppositories without asking: the doctor may suggest a gentle one for a few weeks or months, which is common and safe under their care.']],
  ] },
  { id: 'accidents', emoji: '💦', title: 'Accidents', sum: 'Normal, and what to do.', parts: [
    ['They\'re normal', ['For weeks, even months: when busy, tired, excited, sick, or somewhere new. A child who is mostly dry still has the odd one.']],
    ['What to do', ['Stay calm and matter-of-fact: "Oops, {pee} goes in the {potty}." Then a sit, and clean clothes.', 'Let {name} help clean up, as a job, not a punishment.', 'Never scold, shame or punish: it adds fear, and fear makes holding and accidents worse.']],
    ['Lots of them?', ['Look at Progress: if accidents come just before the timer, shorten it. If they come at one time of day, add a try then.', 'Many accidents after weeks of progress, pain when peeing, or peeing very often can be a urine infection or constipation: call the doctor.']],
  ] },
  { id: 'refuses', emoji: '🙅', title: 'Won\'t sit, says no', sum: 'Power struggles, and when to take a break.', parts: [
    ['Make it theirs', ['Offer choices: which potty, which book, which sticker. Let {name} take the diaper off, flush, and wash hands.', 'Let a toy or stuffed animal "go first".']],
    ['Take a break', ['If every sit is a fight for a week or two, stop for a few weeks to a couple of months. Put the potty out of mind, then start again gently. Pediatricians recommend this: a battle can turn into holding, which is harder to undo.']],
  ] },
  { id: 'fear', emoji: '😨', title: 'Scared of the toilet or flush', sum: 'Big holes, loud noises.', parts: [
    ['What helps', ['A floor potty first, or a child seat that fits, with a stool for the feet.', 'Flush after {name} has left the room, or let {name} hold your hand and press it when ready.', 'In public, a sticky note over the automatic flush sensor stops it going off mid-sit. Covering little ears helps too.']],
  ] },
  { id: 'regression', emoji: '↩️', title: 'Going backwards', sum: 'After a new baby, a move, illness or a new daycare.', parts: [
    ['It\'s common', ['Big changes often bring accidents back for a while, even after months of being dry.']],
    ['What helps', ['Back to basics: reminders, the timer, sits at set times, stickers. No shame: "Your body forgot for a bit; we\'ll help it remember."', 'Extra one-on-one time often helps more than anything about the potty.']],
    ['Call the doctor', ['If {name} was dry for six months or more and starts wetting again with no reason you can see, or has pain, fever, thirst, or is peeing much more: it can be an infection or something else worth checking.']],
  ] },
  { id: 'out', emoji: '🛒', title: 'Out and about', sum: 'Outings, the car, public toilets.', parts: [
    ['Before you go', ['A try before leaving, on arrival, and before heading home. Find the toilets as soon as you arrive.']],
    ['In the bag', ['A travel potty or folding seat, two sets of clothes, wipes, plastic bags, and a towel or pad for the car seat.']],
    ['Public toilets', ['Hold {name} steady on the edge, or use the folding seat. A sticky note covers an automatic flush sensor.']],
  ] },
  { id: 'care', emoji: '🏫', title: 'Daycare, sitters and grandparents', sum: 'Everyone doing it the same way.', parts: [
    ['Share how you do it', ['The same words, the same "It\'s {potty} time", and the same calm about accidents. Send the handoff note (in the menu), or print it.', 'Ask daycare how they do it: many have set times. Matching them at home helps.', 'Invite a grandparent or nanny to Sharing so they can log and see how the day has gone.']],
    ['In the bag', ['Two or three sets of clothes, labeled, and a bag for wet things.']],
  ] },
  { id: 'standing', emoji: '🧍', title: 'Standing to pee', sum: 'For boys, and when.', parts: [
    ['Sit first', ['Most boys learn sitting for both, so poops don\'t get missed. Standing comes later, often by watching a dad, brother or friend.']],
    ['Aiming', ['A piece of cereal in the bowl makes a target. A step stool helps reach. Point it down.']],
  ] },
  { id: 'wiping', emoji: '🧼', title: 'Wiping and washing hands', sum: 'Front to back, soap, the ABCs.', parts: [
    ['Wiping', ['Girls wipe front to back. Grown-ups help with poop wipes for a good while: many children need help until about 4 or 5. Flushable wipes clog pipes: use toilet paper, or put wipes in the trash.']],
    ['Hands', ['Wet, soap, scrub for 20 seconds (the ABC song), rinse, dry. The Wash hands timer in Kid mode shows the steps.']],
  ] },
  { id: 'rewards', emoji: '⭐', title: 'Rewards that help', sum: 'Stickers, praise, and fading them out.', parts: [
    ['Keep it simple', ['Specific praise matters most: the AAP puts it ahead of treats. A sticker right away, on the spot, and a small prize after a set number (Stickers in the menu) can help too.']],
    ['Fade it out', ['Once {name} is mostly dry, move to stickers for asking, or for a dry day, then let them stop. Most children are happy to drop them.']],
    ['Avoid', ['Taking stickers away for accidents, or sweets as the reward for every trip.']],
  ] },
  { id: 'needs', emoji: '🧩', title: 'Children who need more time', sum: 'Late talkers, autism, and other needs.', parts: [
    ['It still happens', ['Children with speech delays, autism, developmental delays or medical conditions usually do learn: often later, and step by step.']],
    ['What helps', ['A picture schedule of the steps (pants down, sit, wipe, flush, wash). Set times rather than waiting for signs. One small step at a time, practiced often.', 'Ask the pediatrician, or an occupational therapist, who can tailor a plan.']],
  ] },
];

// When to call the doctor (or get help now): [sign, now (true: go now or call 911)].
const URGENT = [
  ['Pain or burning when peeing, peeing very often, or pee that smells strong or looks cloudy', false],
  ['A fever with tummy pain, or pain in the side or back', false],
  ['Blood in pee or poop', false],
  ['Hard, painful poops, or holding poop in, for more than two weeks', false],
  ['Poop leaking into underwear in a child who was trained', false],
  ['Wetting again after six months or more of being dry, with no reason you can see', false],
  ['Very thirsty, peeing a lot more, tired, or losing weight', false],
  ['Not dry in the daytime at all by 4, or daytime wetting most days after 5', false],
  ['A swollen or very painful belly, green or bloody vomit, or not peeing for 8 hours or more with a dry mouth and no tears', true],
];
const ASK_DOCTOR = 'Tot Potty gives general information from pediatric sources, not medical advice. Every child is different: ask your child\'s doctor about anything that worries you.';

// Nights: why they come later, and what helps.
const NIGHT_GUIDE = [
  ['It comes later, by itself', 'Staying dry at night depends on the body: a hormone that slows pee at night, and a bladder big enough to hold it. Neither can be taught. Many children are dry at night months or years after the day, and wetting the bed is common to 5 or 6, and normal to about 7.'],
  ['When to try', 'When {name} wakes up dry most mornings for a couple of weeks. Log mornings here and the app says when.'],
  ['What helps', 'Drinks spread through the day, fewer in the hour before bed. A last pee as part of the bedtime routine. A night light and a clear path to the potty. A waterproof mattress cover, and a spare set of sheets and pajamas within reach.'],
  ['What doesn\'t', 'Waking or carrying {name} to pee at night doesn\'t teach dryness (fine now and then to save the sheets). Nor do cutting drinks during the day, or rewards and punishments for dry or wet nights: a child can\'t control it.'],
  ['Ask the doctor', 'If {name} still wets most nights after 5 and it bothers {name} or you (there\'s help from that age), or at 7 in any case. Sooner if {name} starts wetting again after six months dry, or has pain, thirst or daytime wetting too.'],
];

// Things that help, ticked off as they're got.
const GEAR = [
  { id: 'potty', emoji: '🚽', text: 'A floor potty, or a child seat for the toilet', why: 'A floor potty is easiest at first; a seat skips a step later.' },
  { id: 'stool', emoji: '🪜', text: 'A step stool', why: 'For climbing up, and for feet to push on while pooping.' },
  { id: 'undies', emoji: '🩲', text: '10 to 15 pairs of underwear, ones {name} picks', why: 'You go through a lot at first.' },
  { id: 'pants', emoji: '👖', text: 'Elastic-waist pants and easy clothes', why: 'No overalls, belts or tights for a while.' },
  { id: 'travel', emoji: '🧳', text: 'A travel potty or folding seat', why: 'For the car, the park, and big public toilets.' },
  { id: 'mattress', emoji: '🛏️', text: 'A waterproof mattress cover', why: 'For naps and nights, and peace of mind.' },
  { id: 'carseat', emoji: '🚗', text: 'A waterproof car seat pad', why: 'Saves the car seat from accidents.' },
  { id: 'stickers', emoji: '⭐', text: 'Stickers, and a small prize', why: 'Or use the sticker chart in Kid mode.' },
  { id: 'books', emoji: '📚', text: 'A potty book', why: 'Potty by Leslie Patricelli; Everyone Poops by Taro Gomi; Daniel Goes to the Potty; Once Upon a Potty by Alona Frankel.' },
  { id: 'spare', emoji: '👕', text: 'Spare clothes in every bag', why: 'Two sets, and a bag for wet things.' },
  { id: 'wipes', emoji: '🧻', text: 'Wipes and a cleaning spray', why: 'For floors and car seats. Keep wipes out of the toilet.' },
];

// The Sit timer's song (to the tune of Twinkle Twinkle, which is old and free to use): each line, then its
// notes as [note, beats].
const SIT_SONG = [
  'Sitting, sitting on the {potty},', 'Feet on the stool, still and steady,', 'Take a breath and blow it out,', 'Let it come, without a doubt,',
  'Sitting, sitting, nice and slow,', 'Listen to your body go!',
];
const TUNE = [['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2],
  ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2], ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2]];
// Washing hands, step by step: [emoji, words, seconds].
const WASH = [['💧', 'Wet your hands', 3], ['🧼', 'Soap!', 3], ['👐', 'Rub, rub, rub: fronts, backs, fingers and thumbs', 20], ['🚿', 'Rinse it all off', 4], ['🧻', 'Dry them', 4]];
// Prizes to pick from, or type your own.
const PRIZES = ['a trip to the park', 'a new book', 'picking what\'s for dinner', 'a bubble bath with extra bubbles', 'a small toy', 'pancakes for breakfast', 'a special outing', 'a movie night'];

const SOURCES = [
  'American Academy of Pediatrics, HealthyChildren.org: Toilet Training; The Right Age to Toilet Train; Creating a Toilet Training Plan; Toilet Training Resistance',
  'NHS: How to potty train; Bedwetting in under-5s; Constipation in children',
  'Schum TR et al. Sequential acquisition of toilet-training skills. Pediatrics, 2002',
  'Blum NJ et al. Relationship between age at initiation of toilet training and duration of training. Pediatrics, 2003',
  'Taubman B. Toilet training and toileting refusal for stool only. Pediatrics, 1997',
  'Foxx RM, Azrin NH. Dry pants: a rapid method of toilet training children. Behaviour Research and Therapy, 1973; and Toilet Training in Less Than a Day, 1974',
  'Brazelton TB. A child-oriented approach to toilet training. Pediatrics, 1962',
  'NICE CG111: Bedwetting in under 19s',
  'NIDDK: Constipation in Children',
  'Choby BA, George S. Toilet training. American Family Physician, 2008',
];
