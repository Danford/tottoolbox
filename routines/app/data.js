// Tot Routines content: what's realistic at each age, the steps a routine can be built from, the
// starting routines, and the guide. Plain browser script (globals), also loaded by test/routines.test.js.
//
// Summarized from: AAP (HealthyChildren.org) on sleep, screens, toilet training and tooth care; the AASM's
// 2016 sleep-duration consensus, which the AAP endorses; CDC "Learn the Signs. Act Early." milestones
// (2022 revision); ADA/AAP fluoride toothpaste amounts; Ellyn Satter's division of responsibility in
// feeding. Ages are typical, not deadlines: the app says so wherever it shows them.

// Age bands, by age in months. A child is in the first band whose `to` is above their age.
const BANDS = [
  { id: 't1', from: 12, to: 24, name: 'Young toddler', span: '12–23 months',
    sleep: { total: [11, 14], naps: 'Usually moving from two naps to one, often between 12 and 18 months. One nap of 1½–3 hours after that.' },
    maxSteps: 6, attention: 'A couple of minutes on one thing, longer when it is their idea.',
    directions: 'Follows a one-step direction with a gesture ("give me the cup" while you point).',
    big: [
      'They learn the routine by doing it with you over and over. You do most of the work; they "help".',
      'Order matters far more than the clock. Same steps, same order, every time.',
      'Words for time ("in five minutes") mean nothing yet. Use what comes next: "after the bath, pajamas".',
      'Big feelings at transitions are normal. Saying "no" is a sign of growing independence, not defiance.',
    ] },
  { id: 't2', from: 24, to: 36, name: 'Two-year-old', span: '2 to 3 years',
    sleep: { total: [11, 14], naps: 'One afternoon nap, often 1–2½ hours.' },
    maxSteps: 7, attention: 'Roughly 4–6 minutes on a task you choose.',
    directions: 'Follows one-step directions without a gesture; starting on two steps.',
    big: [
      '"Me do it!" Give them a real job in each step, even if it takes longer, and finish the hard part yourself.',
      'Two choices beat a question: "red cup or blue cup?", not "do you want to brush teeth?".',
      'Expect stalling at bedtime and short meltdowns at transitions. Stay calm and keep the steps the same.',
      'Many children show signs of being ready for the potty between 18 and 30 months. There is no fixed age.',
    ] },
  { id: 't3', from: 36, to: 48, name: 'Three-year-old', span: '3 to 4 years',
    sleep: { total: [10, 13], naps: 'Many still nap; many stop between 3 and 5. If the nap is gone, keep 30–60 minutes of quiet time.' },
    maxSteps: 8, attention: 'Roughly 6–8 minutes on a task you choose.',
    directions: 'Follows two-step directions ("put on your shoes and get your coat").',
    big: [
      'Can do several steps alone with reminders, and loves checking off a picture chart.',
      'Starts to understand "first, then": "first teeth, then story".',
      'Puts on loose clothes and shoes, uses a fork. Buttons and zips are still hard.',
      'Testing limits is part of the job. A routine lets the chart be the boss instead of you.',
    ] },
  { id: 't4', from: 48, to: 72, name: 'Four- and five-year-old', span: '4 to 5 years',
    sleep: { total: [10, 13], naps: 'Most have stopped napping. A rest or quiet time still helps on long days.' },
    maxSteps: 10, attention: 'Roughly 8–12 minutes on a task you choose.',
    directions: 'Follows three-step directions and can remember a routine they have practiced.',
    big: [
      'Can run most of a familiar routine alone, with you checking in.',
      'Ready for small real responsibilities: setting a place at the table, packing their bag.',
      'Can help plan the routine and pick the pictures, which makes them far more willing to follow it.',
      'Can understand a simple clock or timer ("when the big hand is on the 6").',
    ] },
  { id: 't5', from: 72, to: 96, name: 'Six- and seven-year-old', span: '6 to 7 years',
    sleep: { total: [9, 12], naps: 'No naps. Long school days make a steady bedtime matter more, weekends included.' },
    maxSteps: 12, attention: 'Roughly 12–20 minutes on a task you choose, longer on their own interests.',
    directions: 'Follows several steps in a row and remembers a routine they have practiced for a while.',
    big: [
      'Can run a familiar routine alone, with a checklist to keep it on track. You check in rather than direct.',
      'School uses up a lot of their self-control. Tired, hungry or tearful after school is common, especially early in the year.',
      'Ready for real jobs: packing their own bag, helping make their lunch, feeding a pet.',
      'Starts reading a clock, but still can\'t judge how long things take. Mornings need a "leave in 10 minutes" warning.',
    ] },
];

// Ages this app is written for. Younger or older children get the nearest band and a note.
const MIN_MONTHS = 12, MAX_MONTHS = 96;

// Every step a routine can use. `expect` says what is realistic in each band; a band left out means the
// step isn't suggested at that age (it can still be added). `how` is how to teach it.
const STEPS = {
  wake:      { emoji: '☀️', label: 'Good morning',
    expect: { t1: 'A cuddle and the same words each morning ("Good morning! Time to get up").', t2: 'Same greeting; they may want to open the curtains.', t3: 'Can get out of bed and come find you. A toddler clock that changes color shows when it is OK to get up.', t4: 'Can wait in bed until a set clock time, and may start the next step alone.', t5: 'Can get up to an alarm or wake-up light and start the next step alone.' },
    how: 'A wake-up light or color-changing clock answers "is it morning yet?" for children who can\'t tell time.' },
  potty:     { emoji: '🚽', label: 'Potty',
    expect: { t1: 'Diaper change. Talk about what you\'re doing; they may want to hold the wipes.', t2: 'Diaper or potty. If training, offer the potty at set times rather than asking "do you need to go?" (the answer is usually no).', t3: 'Many are day-trained or close. Still needs reminders and help wiping.', t4: 'Mostly independent in the day. Dry nights can take until 5–7 years and aren\'t something they can control.', t5: 'Independent. Some still wet the bed at night; that\'s common to about 7 and not in their control.' },
    how: 'Put the potty at fixed points in routines (after waking, before leaving, before bed) so it becomes automatic.' },
  dress:     { emoji: '👕', label: 'Get dressed',
    expect: { t1: 'You dress them. They can push arms through sleeves and pull off socks and hats.', t2: 'Can take off simple clothes and help pull up pants. You do the rest.', t3: 'Can put on loose pants, a T-shirt and a jacket. Shirts may end up backwards: that\'s fine.', t4: 'Mostly dresses alone. May still need help with buttons, zips and laces.', t5: 'Dresses alone, most buttons and zips included. Many learn to tie laces around 6–7.' },
    how: 'Lay out two outfits the night before and let them choose one. Teach jackets with the "flip" trick: coat on the floor, arms in, flip over the head.' },
  breakfast: { emoji: '🥣', label: 'Breakfast',
    expect: { t1: 'Feeds self with fingers and starts with a spoon. Messy is how they learn.', t2: 'Uses a spoon and cup. Sits for a short meal, often 10–15 minutes.', t3: 'Uses a fork, can pour from a small jug with spills.', t4: 'Can serve themselves some foods and help make simple breakfasts.', t5: 'Can pour cereal and milk, spread toast and put their bowl away.' },
    how: 'You decide what is offered and when; they decide whether and how much to eat. Pressure to eat usually backfires.' },
  teeth:     { emoji: '🪥', label: 'Brush teeth',
    expect: { t1: 'You brush, twice a day, with a smear of fluoride toothpaste the size of a grain of rice.', t2: 'They "have a turn" first, then you brush properly. Still a rice-grain smear.', t3: 'Pea-sized amount of fluoride toothpaste from age 3. They brush, you finish.', t4: 'They brush; you still check and finish. Most children need help until about 7–8.', t5: 'Brushes alone. You still check and finish until about 7–8, and floss for them.' },
    how: 'A two-minute song or sand timer makes the length predictable. Brushing in front of a mirror together helps them copy you.' },
  face:      { emoji: '🧼', label: 'Wash hands & face',
    expect: { t1: 'You wash; they splash. Name the steps: "water, soap, rub, rinse".', t2: 'Can rub hands with soap and rinse with help reaching the tap.', t3: 'Washes hands mostly alone with a step stool. Remind them to use soap.', t4: 'Washes alone. Singing "Happy Birthday" twice is about the 20 seconds that gets hands clean.', t5: 'Washes alone.' },
    how: 'A sturdy step stool at the sink turns this into something they can do themselves.' },
  shoes:     { emoji: '👟', label: 'Shoes & coat',
    expect: { t1: 'You put them on. They can sit on the step and hold their foot out.', t2: 'Can pull off shoes and push feet into easy slip-ons with help.', t3: 'Puts on velcro or slip-on shoes. Often on the wrong feet.', t4: 'Shoes and coat alone; laces and zips still need a hand.', t5: 'Alone, laces maybe with help. Knows where everything lives by the door.' },
    how: 'Give this step a fixed spot by the door so shoes are always in the same place.' },
  bag:       { emoji: '🎒', label: 'Pack bag',
    expect: { t3: 'Can carry their own bag and put one thing in it (water bottle, lovey).', t4: 'Can pack a short list from a picture checklist.', t5: 'Packs their school bag from a short checklist, ideally the night before.' },
    how: 'Pack the night before as part of bedtime when mornings are rushed.' },
  carseat:   { emoji: '🚗', label: 'Into the car seat',
    expect: { t1: 'You lift and buckle. Rear-facing for as long as the seat allows.', t2: 'Can climb in with help. You do the buckles and check the straps are snug.', t3: 'Climbs in alone; can sometimes clip the lower buckle. You always check.', t4: 'Climbs in and may do some buckles. Stays in a harnessed seat until it is outgrown.', t5: 'A booster seat in the back once the harnessed seat is outgrown, until the adult belt fits (usually between 8 and 12).' },
    how: 'The car seat isn\'t negotiable, so don\'t ask. Offer a choice that is real: "climb in yourself or shall I lift you?"' },
  bath:      { emoji: '🛁', label: 'Bath',
    expect: { t1: 'You do everything; always within arm\'s reach. Bath toys help.', t2: 'Can wash their tummy and legs with a cloth. Hair washing may be a battle.', t3: 'Washes some of their body; still needs constant supervision in water.', t4: 'Washes most of their body with reminders. You still rinse hair and stay close.', t5: 'Washes alone with you nearby; may still need help rinsing hair. Some prefer a shower now.' },
    how: 'A nightly bath isn\'t needed; two or three a week is plenty for most toddlers. On other nights keep the time slot for a warm washcloth so the routine stays the same.' },
  pajamas:   { emoji: '🩳', label: 'Pajamas',
    expect: { t1: 'You dress them. Let them choose between two pajamas.', t2: 'Helps pull pajamas on and off.', t3: 'Puts on pajamas mostly alone.', t4: 'Changes alone and puts clothes in the hamper.', t5: 'Changes alone and puts clothes in the hamper.' },
    how: 'Choosing between two pajamas gives a sense of control without opening a negotiation about bedtime.' },
  drink:     { emoji: '💧', label: 'Last drink of water',
    expect: { t2: 'A small drink of water, then teeth. After that, water only from a cup by the bed.', t3: 'Same. Builds in the "but I\'m thirsty" request before it happens.', t4: 'Same.', t5: 'Same.' },
    how: 'Put this step before the end of the routine so it can\'t be used to delay lights-out.' },
  books:     { emoji: '📚', label: 'Books',
    expect: { t1: 'One or two short books. Pointing and naming pictures counts.', t2: 'Two or three books; they will want the same one again and again. That repetition helps language.', t3: 'Two or three books, chosen by them. Agree the number before you start.', t4: 'Longer stories or a chapter. They can "read" a familiar book to you.', t5: 'Reads some words to you and listens to chapter books. Keep reading aloud even once they can read alone.' },
    how: 'Set the number before you start ("two books tonight") and let them count them off on their fingers.' },
  song:      { emoji: '🎵', label: 'Song & cuddle',
    expect: { t1: 'The same short song or phrase every night signals sleep.', t2: 'Same song, plus a cuddle. A comfort object can be part of this after the first birthday.', t3: 'Talk about one good thing from their day.', t4: 'A short chat about the day, then the same goodnight words.', t5: 'A short chat: one good thing and one hard thing from the day. Worries often come out at bedtime.' },
    how: 'Use the same goodnight words every night. Familiar words become a cue for sleep on their own.' },
  lights:    { emoji: '🌙', label: 'Lights out',
    expect: { t1: 'Into the crib drowsy but awake when you can, so they learn to fall asleep there.', t2: 'Expect "one more" requests. Answer each the same short, calm way.', t3: 'May move to a bed. Some get out repeatedly; quietly walk them back with as few words as possible.', t4: 'Falls asleep alone most nights. Fears of the dark are common: a dim warm night-light is fine.', t5: 'Falls asleep alone. If worries keep them up, talk earlier in the routine, not at lights-out.' },
    how: 'Put screens away at least an hour before sleep. Keep the room dark, cool and the same every night.' },
  quiet:     { emoji: '🧸', label: 'Quiet down',
    expect: { t1: 'Turn off busy toys and TV; dim the lights. Calm play with you.', t2: 'A five-minute warning, then quiet play. Rough play before sleep winds them up.', t3: 'Can pick one calm activity: puzzle, drawing, a book.', t4: 'Can follow a "quiet time" box of activities on their own.', t5: 'Can choose and run a calm activity alone.' },
    how: 'A visual timer shows "how long until" better than words.' },
  rest:      { emoji: '🛏️', label: 'Nap or quiet time',
    expect: { t1: 'One or two naps a day. Watch for sleepy signs: rubbing eyes, staring, clinginess.', t2: 'One nap, usually after lunch.', t3: 'Nap if they still need one; otherwise 30–60 minutes of quiet time in their room.', t4: 'Quiet time with books or calm toys, even if they don\'t sleep.', t5: 'No nap. A calm half hour after school helps on long days.' },
    how: 'Signs a nap is ending: taking a long time to fall asleep, or the nap pushing bedtime late. A quiet time keeps the rest without the sleep.' },
  handsMeal: { emoji: '🧼', label: 'Wash hands',
    expect: { t1: 'You wash their hands; name each step.', t2: 'Washes with help reaching the tap.', t3: 'Washes alone with a step stool.', t4: 'Washes alone.', t5: 'Washes alone.' },
    how: 'Same place, same order, before every meal: it becomes the cue that food is coming.' },
  setTable:  { emoji: '🍽️', label: 'Help set the table',
    expect: { t2: 'Can carry their own unbreakable cup or spoon to the table.', t3: 'Can put out napkins or spoons for everyone.', t4: 'Can set a place with a picture placemat to copy.', t5: 'Can set the table for everyone.' },
    how: 'Real jobs build cooperation. Use unbreakable dishes so mistakes don\'t matter.' },
  sit:       { emoji: '🪑', label: 'Sit at the table',
    expect: { t1: 'In a high chair or booster, strapped in. Meals are short: 10–15 minutes.', t2: 'Sits for 10–15 minutes. Getting up means the meal is over.', t3: 'Sits for about 15 minutes with family conversation.', t4: 'Sits for 15–20 minutes and can join conversation.', t5: 'Sits through a 20-minute family meal and joins the talk.' },
    how: 'No screens at the table. Eat together when you can: children copy what they see you eat.' },
  eat:       { emoji: '🍎', label: 'Eat',
    expect: { t1: 'Appetite swings a lot day to day. Offer one food they like alongside new ones.', t2: 'Picky eating peaks around now. A new food can take 10–15 tries before it\'s accepted.', t3: 'Can say when they\'re full. Avoid "one more bite" deals.', t4: 'Can help choose between two healthy options and try a "learning bite".', t5: 'Can serve themselves. Still decides how much; keep offering new foods without pressure.' },
    how: 'You decide what is served, when and where; they decide whether to eat and how much. Keep meal and snack times regular.' },
  clear:     { emoji: '🧽', label: 'Clear plate',
    expect: { t2: 'Hands you their plate or bowl.', t3: 'Carries their plate to the counter.', t4: 'Carries plate and cup, scrapes scraps into the bin with help.', t5: 'Clears their place and can help load the dishwasher.' },
    how: 'Thank them for the specific job ("you carried your bowl all the way") rather than a general "good job".' },
  tidy:      { emoji: '🧺', label: 'Toys away',
    expect: { t1: 'Puts a few toys in a bin with you. Make it a game.', t2: 'Tidies with you; needs one clear direction at a time ("blocks in the box").', t3: 'Tidies one area alone with a reminder. Picture labels on bins help.', t4: 'Tidies a room with a checklist and a clean-up song.', t5: 'Tidies their room with a checklist; usually needs a reminder to start.' },
    how: 'Fewer toys out means a manageable clean-up. Use the same clean-up song every time.' },
  screenOff: { emoji: '📺', label: 'Screens off',
    expect: { t1: 'Under 18 months, the AAP advises no screens other than video chat.', t2: 'From 18–24 months, a little high-quality content watched with you. From 2, no more than 1 hour a day.', t3: 'Up to 1 hour a day of high-quality content, ideally with you.', t4: 'Same limit. A timer that ends the show (not you) avoids a fight.', t5: 'From 6, the AAP suggests consistent family limits so screens don\'t crowd out sleep, play and activity.' },
    how: 'Warn before the end ("after this episode"), then turn it off without debate. Keep the hour before bed screen-free.' },
};

// School-day steps.
Object.assign(STEPS, {
  layout:    { emoji: '👚', label: 'Lay out tomorrow',
    expect: { t3: 'Chooses between two outfits for tomorrow.', t4: 'Picks tomorrow\'s clothes and puts them out.', t5: 'Lays out clothes and puts the packed bag by the door.' },
    how: 'Every decision made the night before is one less to argue about in a rushed morning.' },
  lunch:     { emoji: '🥪', label: 'Lunchbox & water bottle',
    expect: { t3: 'Carries their water bottle and puts it in their bag.', t4: 'Chooses between two things for lunch and puts the box in their bag.', t5: 'Helps pack lunch: picks a fruit, fills the water bottle, closes the box.' },
    how: 'A fridge shelf with lunch choices you\'re happy with makes it their job and not a morning decision.' },
  unpack:    { emoji: '📤', label: 'Unpack bag',
    expect: { t3: 'Hangs up their bag and hands you anything inside.', t4: 'Hands you the folder and puts the lunchbox in the kitchen.', t5: 'Empties their bag: lunchbox to the kitchen, folder out for you to check.' },
    how: 'Same spot by the door every day. Notes from school travel in the folder, so checking it daily means nothing gets missed.' },
  snack:     { emoji: '🍎', label: 'Snack',
    expect: { t1: 'A snack at the same time each day, sitting down.', t2: 'A snack at a regular time, at the table.', t3: 'Same. Children often come home hungry and frazzled.', t4: 'Same. Food before questions.', t5: 'Can get their snack from a shelf you\'ve set up.' },
    how: 'Children often come out of school hungry and running on empty. Food first; questions about the day can wait.' },
  downtime:  { emoji: '🛋️', label: 'Downtime',
    expect: { t3: 'Free play or quiet time after a long day.', t4: 'Free play, outside if you can.', t5: 'Free play, outside if you can. Many children hold it together all day at school and come apart at home; downtime first helps.' },
    how: 'Unstructured play after a structured day. Their choice, not a screen if you can help it.' },
  homework:  { emoji: '✏️', label: 'Reading or homework',
    expect: { t4: 'Reading together. Kindergarten homework, if any, is short.', t5: 'A short practice, often 10–20 minutes of reading aloud. Sit nearby; help them start, but don\'t do it for them.' },
    how: 'Same time and place each day, after a snack and some play rather than straight in the door. If it often ends in tears, tell the teacher.' },
});

// The routines a grown-up can start from. Steps are in order; `extra` steps are offered but start off.
const TEMPLATES = [
  { id: 'bedtime', name: 'Bedtime', emoji: '🌙', when: '19:00',
    intro: 'Start here. Bedtime is the routine with the clearest payoff: a predictable bedtime routine is linked to falling asleep faster and waking less.',
    steps: ['screenOff', 'layout', 'bath', 'pajamas', 'drink', 'potty', 'teeth', 'books', 'song', 'lights'], extra: ['screenOff', 'layout', 'bath', 'drink'] },
  { id: 'school', name: 'School morning', emoji: '🎒', when: '07:00',
    intro: 'Work back from when you leave, and aim to be ready 10 minutes early. Clothes laid out and the bag packed the night before take most of the rush out.',
    steps: ['wake', 'potty', 'dress', 'breakfast', 'teeth', 'face', 'lunch', 'shoes', 'bag'], extra: ['face'] },
  { id: 'afterSchool', name: 'After school', emoji: '🏠', when: '15:30',
    intro: 'Food and downtime first. Many children hold it together all day at school and come home running on empty; homework goes better after a break.',
    steps: ['unpack', 'handsMeal', 'snack', 'downtime', 'homework'] },
  { id: 'morning', name: 'Morning', emoji: '☀️', when: '07:00',
    intro: 'Mornings go better when the decisions were made the night before: clothes picked, bag packed.',
    steps: ['wake', 'potty', 'dress', 'breakfast', 'teeth', 'face', 'shoes', 'bag'], extra: ['face'] },
  { id: 'nap', name: 'Nap or quiet time', emoji: '😴', when: '12:30',
    intro: 'A shorter version of bedtime. Using the same last steps (song, lights) tells their body it\'s time to rest.',
    steps: ['quiet', 'potty', 'books', 'song', 'rest'] },
  { id: 'meal', name: 'Mealtime', emoji: '🍽️', when: null,
    intro: 'Regular meal and snack times, eaten together at the table, are the routine. The steps around them make it predictable.',
    steps: ['tidy', 'handsMeal', 'setTable', 'sit', 'eat', 'clear', 'handsMeal'], extra: ['tidy'] },
  { id: 'out', name: 'Leaving the house', emoji: '🚪', when: null,
    intro: 'Transitions are hardest for toddlers. A short, fixed leaving routine takes the surprise out of it.',
    steps: ['tidy', 'potty', 'shoes', 'bag', 'carseat'], extra: ['tidy'] },
  { id: 'tidy', name: 'Clean-up', emoji: '🧺', when: null,
    intro: 'Short and often beats one big tidy. Before meals and before bed are natural times.',
    steps: ['tidy', 'handsMeal'] },
];

// How to make any routine stick. Shown in the guide and, a tip at a time, on the home screen.
const TIPS = [
  { t: 'Start with one routine', d: 'Bedtime is usually best. Once it runs on its own (often 2–4 weeks), add another.' },
  { t: 'Same order, every time', d: 'Predictability is the point. The order matters more than the exact time.' },
  { t: 'Keep it short', d: 'Fewer steps for younger children. If they lose interest midway, the routine is too long for now.' },
  { t: 'Make it visual', d: 'Show the picture chart at their eye level and let them tick each step. The chart becomes the boss: "what does the chart say comes next?"' },
  { t: 'Warn before a change', d: 'Toddlers can\'t judge time. Say what comes next ("after this book, lights out") or use a visual timer.' },
  { t: 'Offer two choices inside the routine', d: '"Dinosaur or rocket pajamas?" gives control without reopening whether pajamas happen.' },
  { t: 'Do it with them', d: 'Toddlers learn by copying. Brush your teeth beside them; tidy alongside them.' },
  { t: 'Praise the specific thing', d: '"You put your shoes on by yourself!" teaches more than "good job".' },
  { t: 'Expect pushback at first', d: 'Testing a new routine for a week or two is normal. Calm and consistent wins; giving in once teaches that pushing works.' },
  { t: 'Bend, don\'t break', d: 'Sick days, travel and new siblings disrupt things. Keep the last two or three steps of bedtime the same wherever you are.' },
  { t: 'Expect setbacks', d: 'Regressions often come with big changes: a new skill, a move, a new baby. Go back to basics and they usually pass.' },
  { t: 'Let them help build it', d: 'From about 3, letting them choose the pictures or the song makes them far more invested.' },
];

// Things worth a word with the pediatrician. Shown at the bottom of the age snapshot.
const ASK_DOCTOR = 'Ask your pediatrician if your child snores loudly most nights, is very hard to settle every night for weeks, ' +
  'loses skills they had, or if anything here worries you. This app gives general guidance, not medical advice.';

// When a child says no to a step or a planned activity. Shown from an activity's sheet and in the guide;
// `siblings` only when there's more than one child in the app.
const SAID_NO = {
  why: {
    t1: 'At this age "no" is one of the first words, and often means "I\'m busy with something else" more than "I won\'t". ' +
      'Young toddlers find it hard to stop one thing and start another. One small step, done together, works best.',
    t2: 'Two-year-olds say no to feel in charge. It\'s healthy and it peaks around now. Fewer orders and more choices ' +
      'help, with the same calm routine every day.',
    t3: 'Three-year-olds want control and to be seen as capable. A job that sounds like an order, a contest they might ' +
      'lose, or something new can all bring a no. Choices, real responsibility and being asked for help work well.',
    t4: 'Four- and five-year-olds care about fairness and being big. They push back on what feels babyish, unfair or ' +
      'bossy, and respond to a real say in the plan, a grown-up job and a reason.',
    t5: 'Six- and seven-year-olds spend the school day following someone else\'s rules. A no at home, especially ' +
      'straight after school, is often tiredness or wanting some control back. A snack and a break first, a real say ' +
      'in the plan, and a reason work better than insisting.',
  },
  // Often the same job is happily done for a person and refused from a list.
  framing: 'If they help happily in everyday life but say no to the app\'s version, the difference is usually how it ' +
    'was asked. Helping someone feels like being on the team; a job on a list, or a race, feels like an order or a ' +
    'test. Ask for help with you ("Can you help me with the blocks?") rather than handing it over as their job.',
  first: [
    { t: 'Connect first', d: 'Get down to their level and notice what they\'re doing ("You\'re building a tall tower"). A request lands better after a moment together.' },
    { t: 'Ask for help, together', d: '"I need a helper. Can you help me?" Toddlers help readily when it means joining in with you.' },
    { t: 'Two choices about how, not whether', d: '"Cars or blocks first?" "The big bin or the little bin?"' },
    { t: 'Make it small', d: '"You do the red ones, I\'ll do the rest." "Just five things." Finishing a small job beats fighting over a big one.' },
    { t: 'Put them in charge', d: 'They set the timer, pick the song, or are the boss who tells you where things go.' },
    { t: 'Must-dos: when, then', d: 'For routine steps that have to happen: "When the toys are in, we\'ll go to the park." Say it once, calmly, and wait.' },
    { t: 'Invitations can wait', d: 'Planned activities are invitations, not chores. If it\'s still no, let it go without fuss and try another day, or let them choose something else.' },
  ],
  avoid: [
    { t: 'Comparing', d: '"Look, your brother did it" turns the job into a contest, and the no into a stand.' },
    { t: 'Prizes for helping', d: 'Rewarding toddlers for helping can make them help less once the rewards stop. Thanks and a hug are enough.' },
    { t: 'Asking again and again', d: 'Each repeat is a fresh chance to say no. One clear ask, then help them start.' },
    { t: 'Battles over invitations', d: 'Forcing a craft or a game teaches that it\'s a battle, and the next one starts with a no.' },
    { t: 'Taking stars away', d: 'Keep the chart for what went well. Ticks they earned stay ticked.' },
  ],
  siblings: [
    { t: 'Thank the helper, don\'t point', d: 'When a younger one jumps in, thank them plainly ("Thank you, you put the blocks in") without turning to the older one.' },
    { t: 'A job that\'s theirs and bigger', d: 'Their own shelf, setting the timer, showing the little one where things go. Being the big kid is a role they want; competing with a toddler isn\'t.' },
    { t: 'Side by side, never a race', d: 'A race against a little brother or sister is one they can\'t feel good about: winning doesn\'t count and losing is worse. Race the timer instead.' },
    { t: 'Their own chart', d: 'A routine that seems meant for "both of you" can feel like being lumped in with the baby. Let the older one choose their own pictures and order.' },
    { t: 'Special time', d: 'A few minutes a day, one to one, where they lead the play and you follow (no teaching or questions). Children who get it cooperate more the rest of the day.' },
  ],
  worry: 'Saying no is a normal, healthy part of growing up. Talk to your pediatrician if it\'s most things, most days, ' +
    'for weeks, or comes with long tantrums, hurting others, or losing skills they had.',
};

// School days: how a child gets there and home, and what helps. `to` and `from` are the ways there and back;
// `who` says whether a person (a driver, whoever picks up) can change day by day; `where` is the hint for
// the place field.
const SCHOOL = {
  to: {
    bus:     { emoji: '🚌', name: 'Bus', who: false, where: 'Bus stop, e.g. Oak St & 5th' },
    carpool: { emoji: '🚗', name: 'Carpool', who: 'Who drives', where: 'Where they\'re picked up, e.g. our house' },
    drive:   { emoji: '🚙', name: 'We drive', who: 'Who drives', where: 'Drop-off, e.g. front car line' },
    walk:    { emoji: '🚶', name: 'Walk', who: 'Who walks with them', where: 'Route or meeting point' },
  },
  from: {
    bus:       { emoji: '🚌', name: 'Bus', who: false, where: 'Bus stop where they get off' },
    carpool:   { emoji: '🚗', name: 'Carpool', who: 'Who drives', where: 'Where they\'re dropped off' },
    pickup:    { emoji: '🚙', name: 'We pick up', who: 'Who picks up', where: 'Pick-up spot, e.g. front car line' },
    aftercare: { emoji: '🏫', name: 'After-school program', who: 'Who picks up', where: 'Program, e.g. YMCA in the gym' },
    walk:      { emoji: '🚶', name: 'Walk', who: 'Who walks with them', where: 'Route or meeting point' },
  },
  tips: [
    { t: 'Sleep sets up the day', d: 'Six- to twelve-year-olds need 9–12 hours. Count back from the school-day wake-up to set bedtime, and keep weekends within about an hour of it.' },
    { t: 'Decide the night before', d: 'Clothes out, bag packed and by the door, lunch chosen. Then the morning has nothing left to argue about.' },
    { t: 'Ready 10 minutes early', d: 'Aim to be at the door with shoes on 10 minutes before you have to leave. Rushing is when mornings fall apart.' },
    { t: 'Say who picks up', d: 'Tell them every morning how they\'re getting home and who will be there, especially on days it changes. Not knowing is a common worry at this age.' },
    { t: 'Food and rest before questions', d: 'Many children hold it together all day at school and unravel at home. A snack, a hug and free play first; questions and homework later.' },
    { t: 'Ask specific questions', d: '"Who did you sit with at lunch?" or "What made you laugh?" gets more than "How was school?". Bedtime is often when it all comes out.' },
    { t: 'Keep the pick-up list current', d: 'Schools only release children to people on their list. Tell the school in writing whenever someone new is picking up.' },
    { t: 'At the bus stop', d: 'Get there 5 minutes early and wait three giant steps back from the curb. When crossing, go in front of the bus where the driver can see them, and only when the driver signals.' },
  ],
};

const SOURCES = [
  'American Academy of Pediatrics, HealthyChildren.org: sleep, screen time, toilet training, oral health',
  'American Academy of Sleep Medicine, recommended sleep amounts for children (2016), endorsed by the AAP',
  'CDC, "Learn the Signs. Act Early." developmental milestones (2022)',
  'American Dental Association and AAP: fluoride toothpaste amounts by age',
  'Ellyn Satter Institute: the division of responsibility in feeding',
  'World Health Organization, guidelines on physical activity, sedentary behaviour and sleep for children under 5 (2019)',
  'AAP, "The Power of Play" clinical report (2018), and AAP policy on reading aloud from birth (literacy promotion, 2014)',
  'Office of Head Start, Early Learning Outcomes Framework, ages birth to five (2015): the areas the day plan balances',
  'Caring for Our Children (AAP, APHA and the National Resource Center): national standards for early care, on daily outdoor play',
  'AAP, HealthyChildren.org: discipline, positive reinforcement and sibling rivalry',
  'Warneken & Tomasello: toddlers help others spontaneously (Science, 2006), and rewards undermine it (Developmental Psychology, 2008)',
  'Parent-Child Interaction Therapy (PCIT International): child-led "special time"',
  'Faber & Mazlish, "Siblings Without Rivalry" (1987): on comparisons between brothers and sisters',
  'AAP, HealthyChildren.org: back-to-school tips, homework, and car seats and boosters for school-age children',
  'National Highway Traffic Safety Administration (NHTSA): school bus safety',
];
