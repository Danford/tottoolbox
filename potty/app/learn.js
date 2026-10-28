// Learn more: for each approach and each of its steps, why it works, what to do and what not to, and what to do
// when it's not going well, each point with the sources it comes from. LEARN[key], the key a METHODS id (the
// approach as a whole) or a stage id: {why: [para], dos: [point], donts: [point], stuck: [para]}, where a para
// or point is [text, ...source ids]. A point with no source is everyday practice, not a finding. The page
// numbers the sources in the order they first appear (learnRefs, logic.js). Placeholders as in guide.js.

// The sources: [who, title, link].
const LEARN_SOURCES = {
  aapAge: ['American Academy of Pediatrics, HealthyChildren.org', 'The Right Age to Toilet Train', 'https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/The-Right-Age-to-Toilet-Train.aspx'],
  aapPlan: ['American Academy of Pediatrics, HealthyChildren.org', 'Creating a Toilet Training Plan', 'https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/Creating-a-Toilet-Training-Plan.aspx'],
  aapConst: ['American Academy of Pediatrics, HealthyChildren.org', 'Constipation in Children', 'https://www.healthychildren.org/English/health-issues/conditions/abdominal/Pages/Constipation.aspx'],
  cps: ['Canadian Paediatric Society. Paediatrics & Child Health, 2000', 'Toilet learning: Anticipatory guidance with a child-oriented approach', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2819951/'],
  nhs: ['NHS (UK)', 'Potty training tips', 'https://www.nhs.uk/conditions/pregnancy-and-baby/potty-training-tips'],
  nhsHT: ['NHS Healthier Together', 'Toilet training', 'https://www.healthiertogether.nhs.uk/child-under-5-years/toilet-training-2'],
  nhsBed: ['NHS (UK)', 'Bedwetting in children', 'https://www.nhs.uk/symptoms/bedwetting/'],
  nice: ['NICE (UK) guideline CG111', 'Bedwetting in under 19s', 'https://www.nice.org.uk/guidance/cg111'],
  afp: ['Choby BA, George S. American Family Physician, 2008', 'Toilet Training', 'https://www.aafp.org/pubs/afp/issues/2008/1101/p1059.html'],
  cmaj: ['Kiddoo DA. Canadian Medical Association Journal, 2012', 'Toilet training children: when to start and how to train', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3307553/'],
  brazelton: ['Brazelton TB. Pediatrics, 1962', 'A child-oriented approach to toilet training', 'https://pubmed.ncbi.nlm.nih.gov/13872676/'],
  blum: ['Blum NJ, Taubman B, Nemeth N. Pediatrics, 2003', 'Relationship between age at initiation of toilet training and duration of training: a prospective study', 'https://pubmed.ncbi.nlm.nih.gov/12671117/'],
  taubman: ['Taubman B. Pediatrics, 1997', 'Toilet training and toileting refusal for stool only: a prospective study', 'https://pubmed.ncbi.nlm.nih.gov/8989338/'],
  schum: ['Schum TR et al. Pediatrics, 2002', 'Sequential acquisition of toilet-training skills: gender and age differences in normal children', 'https://pubmed.ncbi.nlm.nih.gov/11875176/'],
  foxx: ['Foxx RM, Azrin NH. Behaviour Research and Therapy, 1973', 'Dry pants: a rapid method of toilet training children', 'https://pure.psu.edu/en/publications/dry-pants-a-rapid-method-of-toilet-training-children/'],
  niddk: ['NIDDK, US National Institutes of Health', 'Constipation in Children', 'https://www.niddk.nih.gov/health-information/digestive-diseases/constipation-children'],
  cdc: ['US Centers for Disease Control and Prevention', 'About Handwashing', 'https://www.cdc.gov/clean-hands/about/index.html'],
  water: ['Czech-Slovak Pediatrics, 2003', 'Water intoxication caused by excessive intake of hypotonic fluids in young children', 'https://www.prolekare.cz/en/journals/czech-slovak-pediatrics/2003-2/intoxikace-vodou-u-malych-deti-zpusobena-nadmernym-prijmemhypotonickych-tekutin-26486'],
};

// Said on more than one page.
const L_PRAISE = ['Praise trying as well as success, and be specific: "You sat on the {potty} and listened to your body!"', 'aapAge', 'nhs', 'cps'];
const L_NOPUNISH = ['Don\'t scold, shame, or punish accidents, and don\'t take stickers away. Fear and pressure lead to holding, and holding leads to constipation and more accidents.', 'cps', 'aapAge', 'cmaj'];
const L_BATTLE = ['Don\'t turn it into a battle. If {name} fights the {potty} for a week or two, stop for 1 to 3 months, and go back to diapers without any fuss. It builds trust back, and most children try again happily.', 'cps', 'taubman'];
const L_STRESS = ['Don\'t start, or push on, during a big change: a new baby, a move, a new daycare, an illness or a loss in the family.', 'aapAge', 'cps'];
const L_FEET = ['Feet flat on the floor or a stool, knees a little above the hips. Dangling legs make it hard to relax enough to poop.', 'aapConst', 'nhs'];
const L_HANDS = ['Wash hands together every time: wet, soap, scrub for 20 seconds (a song twice through), rinse, dry.', 'cdc', 'aapAge'];
const L_SAME = ['Everyone who cares for {name} uses the same words, the same routine, and the same calm about accidents. The handoff note has it all.', 'cps', 'aapPlan'];
const L_POOP = ['Watch for constipation: soft poops at least every other day are the aim. Hard, painful poops make children afraid to go. Water, fruit, vegetables, beans and whole grains help; see the Constipation guide.', 'nhs', 'aapConst', 'niddk'];

const LEARN = {
  // ---- The 3-day method ----
  three: {
    why: [
      ['The 3-day method is today\'s version of an intensive method two psychologists, Foxx and Azrin, published in 1973. In their study, 34 children were trained in an average of about 4 hours of focused practice, and accidents stayed near zero four months later.', 'foxx'],
      ['It\'s parent-led: you set the pace, and a lot of practice in a short time does the teaching. The child-led approach that the American Academy of Pediatrics (AAP) and the Canadian Paediatric Society favor goes at the child\'s pace instead. Reviews find no good evidence that either is better than the other, so pick the one that suits {name} and your family.', 'cmaj', 'afp', 'cps'],
      ['Age matters more for this method. In a study following 378 children, starting intensive training before about 27 months didn\'t make it finish sooner: it just took longer.', 'blum', 'afp'],
      ['The modern version leaves out two parts of the original: pushing extra drinks, and scolding with "practice drills" after accidents. Today\'s advice is plenty of praise and no punishment.', 'afp', 'cps'],
    ],
    dos: [
      ['Start when {name} shows most of the readiness signs and is about 2½ or older. The Readiness check in the menu goes through them.', 'blum', 'aapAge'],
      ['Clear three days with nothing else planned, and get every grown-up at home on board first.', 'cps'],
      ['Have everything ready before day 1: lots of underwear, easy pants, a potty close by, spare clothes, a car seat liner.', 'nhs'],
      ['Tell {name} what\'s going to happen a day or two before, in simple words, and read a potty book together.', 'nhs'],
      L_PRAISE,
      ['Treat accidents as practice: calm, a quick sit on the {potty}, clean clothes.', 'nhs', 'cps'],
    ],
    donts: [
      ['Don\'t push drinks. Offer them often, but a lot of water in a short time can be dangerous for small children (water intoxication).', 'water'],
      L_NOPUNISH,
      L_STRESS,
      L_BATTLE,
    ],
    stuck: [
      ['If there are still almost no pees in the {potty} by the end of day 3, {name} may not be ready yet. That isn\'t a failure. Switch to the child-led steps, or take a break and try again in a month or two.', 'cps'],
    ],
  },
  d1: {
    why: [
      ['With a bare bottom, {name} sees and feels a pee the moment it starts, with nothing to soak it up. Getting to the {potty} mid-pee links that feeling to the place. That link is what the intensive methods are built on.', 'foxx', 'afp'],
      ['Lots of tries mean lots of chances to succeed and be praised. The quick praise is what makes the learning stick.', 'foxx'],
    ],
    dos: [
      ['Stay in one or two rooms, with the {potty} a few steps away.'],
      ['Watch for the signs: going still or quiet, wiggling, crossing legs, holding the front, squatting, grunting.', 'aapAge', 'nhs'],
      ['When you see a sign, go calmly together. Even a few drops in the {potty} count: praise them.', 'nhs'],
      L_PRAISE,
      ['Offer drinks through the day (water, milk with meals, juicy fruit) so there\'s plenty to practice with.'],
      ['Keep a diaper or pull-up for nap and night.', 'nhs'],
      L_HANDS,
    ],
    donts: [
      ['Don\'t force drinks or set amounts: offer, and let {name} decide.', 'water'],
      L_NOPUNISH,
      ['Don\'t keep {name} sitting for long. A song or two, then up: long sits feel like a punishment.', 'nhs'],
      ['Don\'t keep asking "Do you need to go?": toddlers say no to questions. Say "It\'s {potty} time" instead.'],
    ],
    stuck: [
      ['Lots of accidents on day 1 is normal: it\'s how {name} learns what the feeling means. What matters is that some pees end in the {potty}. If {name} gets upset at every try, stop for the day and think about whether now is the right time.', 'cps'],
    ],
  },
  d2: {
    why: [
      ['Loose pants with nothing under them are the next step from bare bottom. Some children treat snug underwear like a diaper at first, so many families wait a day or two for it.'],
      ['Tries by the timer, and at the times bodies tend to go (on waking, after eating, before going out), catch most pees while {name} learns to notice them.', 'nhs', 'cps'],
      ['Asking for the {potty} is the end goal. Waiting a moment before reminding gives {name} room to notice first.', 'cps', 'schum'],
    ],
    dos: [
      ['Try on waking, after meals and snacks, before going out, before nap and bed, and by the timer in between.', 'nhs', 'cps'],
      ['Now and then, wait to see if {name} goes by themselves, and praise it big when they do.', 'cps'],
      ['Take a short outing (15 to 30 minutes) just after a pee, with a travel potty and spare clothes.', 'nhs'],
      L_PRAISE,
    ],
    donts: [
      ['Don\'t put a diaper back on for the outing. Switching back and forth can tell {name} it\'s fine to go in a diaper sometimes.', 'nhsHT'],
      ['Don\'t battle a child who\'s holding it. Offer a drink and a relaxed sit with a book, and let it come.', 'aapAge'],
      L_NOPUNISH,
    ],
    stuck: [
      ['Holding it all day, then going in the night diaper, is common on day 2. Most children let go in the {potty} once they relax. If {name} hasn\'t peed for 8 hours or more and has a dry mouth or no tears, call the doctor.'],
    ],
  },
  d3: {
    why: [
      ['Staying dry somewhere new is its own skill: new noises, distractions, and big toilets. Practicing on a short trip with you close makes it ordinary.', 'nhs'],
    ],
    dos: [
      ['A try before you leave, when you arrive, and before you head home, and at any toilet you pass.', 'nhs'],
      ['Pack a travel potty or folding seat, two sets of clothes, wipes, bags, and a car seat liner.', 'nhs'],
      ['Show {name} where the toilet is anywhere new.'],
      ['Hold {name} steady on a big toilet, with something under the feet if you can.', 'aapConst'],
    ],
    donts: [
      ['Don\'t let a loud or automatic flush put {name} off: a sticky note over the sensor stops it, and ear defenders help children who mind noise.', 'nhs'],
      ['Don\'t plan a long day out yet: build up from short trips.'],
      ['Don\'t hurry {name} on a public toilet. Rushing makes it hard to relax enough to go.'],
    ],
    stuck: [
      ['An accident while out isn\'t going backwards. Change {name} calmly, and do a shorter outing next time, right after a pee.', 'cps'],
    ],
  },
  d4: {
    why: [
      ['Practice day after day turns the new skill into a habit. Most children take 3 to 6 months from starting to using the toilet on their own, so accidents in these weeks are expected.', 'cps'],
      ['Doing it the same way everywhere matters as much as anything you do at home: different words or rules at daycare can confuse {name}.', 'cps', 'aapPlan'],
    ],
    dos: [
      ['Stretch the timer as trips succeed. Progress shows how often {name} usually goes.'],
      L_SAME,
      ['Keep spare clothes in every bag, and pack them again after an accident.', 'nhs'],
      L_POOP,
      L_HANDS,
    ],
    donts: [
      ['Don\'t go back to diapers in the day just because it\'s easier when you\'re busy: it mixes up the message.', 'nhsHT'],
      L_NOPUNISH,
      ['Don\'t compare {name} with other children: girls tend to be a little earlier than boys, and every child has their own timing.', 'schum', 'cps'],
    ],
    stuck: [
      ['If accidents are still frequent after two weeks, the Canadian Paediatric Society says it\'s fine to go back to diapers for a while, with no blame, and try again later.', 'cps'],
      ['Pain when peeing, peeing very often, or lots of accidents after being dry can be a urine infection or constipation: call the doctor.'],
    ],
  },
  d5: {
    why: [
      ['Asking for the {potty} comes last. {name} has to feel the urge early, stop playing, and say so, and that takes practice.', 'cps', 'schum'],
      ['Staying dry at night is a separate thing: it depends on the body, and often comes months or years after the day.', 'nhsBed', 'cps'],
    ],
    dos: [
      ['Keep sits on waking, before nap and bed, and before going out, long after the timer is off.', 'cps', 'nhs'],
      ['Praise asking most of all.', 'cps'],
      ['Build independence: pulling pants up and down, wiping, flushing, washing hands.', 'nhs'],
      ['Girls wipe front to back, with legs apart.', 'aapAge'],
      ['Help with wiping after a poop for as long as it\'s needed: often until 4 or 5.'],
      ['Keep a diaper or pull-up at night until mornings are dry most of the time.', 'nhs'],
    ],
    donts: [
      ['Don\'t expect nights to follow by themselves soon: bedwetting is common under 5, and isn\'t something {name} can control.', 'nhsBed', 'nice'],
      ['Don\'t make a big deal of the odd accident when {name} is busy, tired, sick or excited: they happen for months.', 'cps'],
      L_NOPUNISH,
    ],
    stuck: [
      ['If {name} still isn\'t using the toilet after repeated tries by about 4, the Canadian Paediatric Society suggests asking the pediatrician, who may refer you to a specialist.', 'cps'],
    ],
  },

  // ---- Child-led, step by step ----
  gentle: {
    why: [
      ['Dr. T. Berry Brazelton, a pediatrician, described this approach in 1962. In 1,170 children in his practice it led to daytime dryness at an average of about 28½ months, and only about 1 in 70 had any wetting problem after age 5.', 'brazelton', 'cmaj'],
      ['The AAP\'s advice builds on it, and the Canadian Paediatric Society recommends it. It moves in small steps, and {name} sets the pace.', 'afp', 'cps'],
      ['It takes weeks to months, and asks less of {name} at each step. Most children take 3 to 6 months from starting to using the toilet on their own. Expect to give it a bit of attention every day for several months.', 'cps'],
    ],
    dos: [
      ['Start when {name} shows some of the readiness signs, often from 18 months to 2½. Readiness matters more than age.', 'cps', 'aapAge', 'nhs'],
      ['Agree on the words for pee, poop and the potty, and have everyone use them.', 'cps'],
      L_SAME,
      ['Use praise and hugs more than prizes. The AAP prefers praise to treats, and the Canadian Paediatric Society advises against relying on material rewards.', 'afp', 'cps'],
      ['Move on when {name} is ready, not on a set date. Going back a step is fine too.', 'cps'],
    ],
    donts: [
      L_STRESS,
      L_BATTLE,
      L_NOPUNISH,
      ['Don\'t expect quick results: the steps are small on purpose.', 'cps'],
    ],
    stuck: [
      ['If a step is stuck for a few weeks, go back one and spend longer there. If {name} pushes back at everything, stop for 1 to 3 months.', 'cps'],
    ],
  },
  s1: {
    why: [
      ['This step makes the {potty} a familiar, nice place with no pressure, a chair like any other. Brazelton started with the child sitting on it dressed, once a day, for one to two weeks, free to get up at any time.', 'brazelton', 'afp'],
      ['Seeing others use the toilet, and hearing words for what\'s happening, teaches what the {potty} is for.', 'cps', 'nhs'],
    ],
    dos: [
      ['Keep the {potty} where {name} can see it and reach it.', 'cps'],
      ['A short sit each day with clothes on, for a story or a song.', 'afp', 'nhs'],
      ['Let {name} watch you, or an older child, use the toilet, and explain what you\'re doing.', 'cps', 'nhs'],
      ['Name it as it happens: "You\'re doing a {poop}."', 'nhs'],
      ['Read potty books, and let a doll or teddy have a turn.', 'nhs'],
      ['Change diapers in the bathroom when you can.', 'nhs'],
    ],
    donts: [
      ['Don\'t hold {name} on the {potty}: getting up whenever they like is the point of this step.', 'afp'],
      ['Don\'t take the diaper off yet, or expect anything to land in the {potty}.', 'afp'],
      ['Don\'t make faces or say "yucky" about pee and poop. Plain, friendly words help.', 'afp', 'cmaj'],
    ],
    stuck: [
      ['If {name} won\'t go near the {potty}, put it away for a few weeks and try again. It\'s a sign to wait, not a problem.', 'cps'],
    ],
  },
  s2: {
    why: [
      ['Now the diaper comes off for the sit. Sitting is all that\'s asked: it gets {name} used to the feel of a bare bottom on the {potty}, at the times a pee or poop is most likely.', 'afp', 'cps'],
      ['The Canadian Paediatric Society suggests sits after waking, after meals or snacks, and before naps and bed. Eating gets the bowels moving, so after a meal is the best time to catch a poop.', 'cps', 'nhs'],
    ],
    dos: [
      ['Two or three sits a day at those times, diaper off.', 'afp', 'cps'],
      ['Keep each one short: a book or a song, then up, whatever happened.', 'nhs'],
      L_PRAISE,
      L_FEET,
      ['Log each sit (Sat, nothing, or what came), so the week counts up on the plan.'],
      ['If something lands in the {potty}, celebrate, but treat it as a bonus.', 'afp'],
    ],
    donts: [
      ['Don\'t insist on a pee or poop. The AAP\'s version of this step asks only for sitting.', 'afp'],
      ['Don\'t keep {name} there with toys or a screen to get a result: long sits turn into a fight.'],
      L_BATTLE,
    ],
    stuck: [
      ['If {name} cries or refuses most sits for a week or two, go back to dressed sits for a while, or stop for 1 to 3 months.', 'cps'],
    ],
  },
  s3: {
    why: [
      ['Children learn where poop goes by seeing it. Brazelton\'s method, and the Canadian Paediatric Society, suggest emptying a dirty diaper into the {potty} with {name}, and explaining that this is where poop goes.', 'afp', 'cps'],
      ['Words matter here. In a study of 406 children, families who used only positive words about poop and praised poops in the diaper saw much shorter stretches of poop refusal.', 'cmaj', 'afp'],
    ],
    dos: [
      ['After a poopy diaper, tip the poop into the {potty} or toilet together: "Poop goes in the {potty}."', 'afp', 'cps'],
      ['Let {name} flush and wave bye-bye, if they want to.', 'aapAge'],
      ['Keep up the sits from Step 2.', 'cps'],
      ['Change diapers in the bathroom, standing up.', 'nhs'],
      L_POOP,
    ],
    donts: [
      ['Don\'t call poop yucky, stinky or dirty.', 'afp', 'cmaj'],
      ['Don\'t flush while {name} is scared of it: flush after they\'ve left, and try ear defenders if the noise bothers them.', 'nhs'],
      ['Don\'t drag {name} out of hiding to poop. It\'s common from about 22 months: offer privacy in the bathroom instead, and keep poop soft, since hiding can go with holding.', 'afp'],
    ],
    stuck: [
      ['About 1 child in 5 goes through a stretch of only pooping in a diaper. Pushing makes it last longer. Let {name} ask for a diaper to poop in, make sure poop is soft, and see the Poop worries guide.', 'taubman', 'afp'],
    ],
  },
  s4: {
    why: [
      ['Time without a diaper, with the {potty} close, lets {name} try using it alone, with gentle reminders from you. It\'s the step where {name} starts to act on the feeling.', 'afp', 'cps'],
      ['The NHS suggests regular diaper-free time at home, starting short, such as half an hour after a pee.', 'nhs'],
    ],
    dos: [
      ['Start with short spells, and build up to a few hours as more pees land in the {potty}.', 'nhs'],
      ['Learn {name}\'s cues, and go together when you see them.', 'cps'],
      ['Gentle reminders every hour or two (the timer).', 'afp'],
      ['Praise every success, even one {name} tells you about after.', 'cps'],
      ['Easy clothes: elastic waists, nothing with buttons, zips or tights.', 'nhs'],
    ],
    donts: [
      L_NOPUNISH,
      ['Don\'t remind constantly: being asked a lot leaves no room to notice the feeling.'],
      ['Don\'t leave the {potty} in another room yet.'],
    ],
    stuck: [
      ['If most pees still miss after a couple of weeks, go back to Step 2 or 3 for a while. Children learn at very different speeds.', 'cps'],
    ],
  },
  s5: {
    why: [
      ['Once {name} has used the {potty} for a week or more, the Canadian Paediatric Society suggests moving to underwear (or cloth training pants), and making it a special occasion.', 'cps'],
      ['The AAP discourages diapers and disposable training pants in the day once training starts: they feel like diapers, so they slow things down.', 'aapAge'],
    ],
    dos: [
      ['Let {name} choose the underwear.', 'nhs', 'cps'],
      ['Wear underwear on outings too, with a try before leaving and a travel potty along.', 'nhs'],
      ['Keep a diaper or pull-up for nap and night, and switch to underwear at naps once {name} is often dry after them.', 'nhs'],
      L_SAME,
      ['Spare clothes in every bag, packed again after an accident.', 'nhs'],
    ],
    donts: [
      ['Don\'t use pull-ups in the day.', 'aapAge'],
      L_NOPUNISH,
      ['Don\'t worry about nights yet.', 'nhsBed'],
    ],
    stuck: [
      ['If accidents become frequent in underwear, the Canadian Paediatric Society says it\'s fine to go back to diapers for a while, with no blame, and try again later.', 'cps'],
    ],
  },
  s6: {
    why: [
      ['{name} knows what to do. Now the aim is for {name} to notice and ask, without reminders. Asking is usually the last skill to come.', 'cps', 'schum'],
    ],
    dos: [
      ['Turn the timer off, but keep the sits on waking, before nap and bed, and before outings.', 'cps', 'nhs'],
      ['Praise asking most of all.', 'cps'],
      ['Build independence: pants, wiping front to back, flushing, washing hands.', 'nhs', 'aapAge'],
      L_HANDS,
    ],
    donts: [
      ['Don\'t expect nights yet: they come when the body is ready, sometimes years later.', 'nhsBed', 'cps'],
      ['Don\'t make much of the odd accident when {name} is busy, tired or sick.', 'cps'],
    ],
    stuck: [
      ['If {name} isn\'t using the toilet after repeated tries by about 4, ask the pediatrician.', 'cps'],
      ['Wetting again after six months of being dry, or pain, fever or thirst, is worth a call to the doctor.', 'nhsBed'],
    ],
  },

  // ---- Potty at set times ----
  routine: {
    why: [
      ['Sits at set times are part of every professional plan: after waking, after meals, before naps and bed, and before going out. This approach starts from them, the way many daycares do.', 'cps', 'nhs'],
      ['Dr. Spock suggested taking the child two or three times a day once they showed interest. The habit comes first, and the feeling follows.', 'afp'],
      ['Set times don\'t wait for {name} to show clear signs, which helps children who don\'t show them much. Children with developmental differences often need a plan made just for them: the pediatrician can help.', 'cps'],
    ],
    dos: [
      ['Pick times that fit your day, and keep them the same at home and at daycare.', 'cps', 'aapPlan'],
      L_SAME,
      L_PRAISE,
      ['Log what happens: in a week or two, Progress shows when {name} tends to go.'],
    ],
    donts: [
      L_STRESS,
      L_BATTLE,
      L_NOPUNISH,
    ],
    stuck: [
      ['If the set times feel like a fight, cut them to two a day (after waking and after a meal) until they\'re easy again.'],
    ],
  },
  r1: {
    why: [
      ['Sitting at the same times each day builds a habit, and catches pees and poops when they\'re most likely: after waking, and after eating.', 'cps', 'nhs'],
    ],
    dos: [
      ['Sit at your set times, diaper off.', 'cps'],
      ['Two or three minutes, with a book or a song.', 'nhs'],
      L_FEET,
      L_PRAISE,
      ['Log each sit and what came of it.'],
    ],
    donts: [
      ['Don\'t keep {name} sitting until something happens.'],
      ['Don\'t insist on a result: sitting calmly is the success for now.', 'afp'],
      L_NOPUNISH,
    ],
    stuck: [
      ['If nothing ever lands in the {potty}, check the times against the log. A sit soon after a meal is the likeliest time for a poop.', 'nhs'],
    ],
  },
  r2: {
    why: [
      ['Underwear in the day lets {name} feel when they\'re wet, and the timer between the set times catches the pees in between.', 'aapAge', 'nhs'],
    ],
    dos: [
      ['Underwear in the day (cloth training pants are fine too).', 'aapAge'],
      ['Tries by the timer between your set times.'],
      ['If accidents come just before the timer, shorten it by 10 or 15 minutes.'],
      ['Spare clothes in every bag, packed again after an accident.', 'nhs'],
    ],
    donts: [
      ['Don\'t use pull-ups in the day.', 'aapAge'],
      ['Don\'t put a diaper back on for outings.', 'nhsHT'],
      L_NOPUNISH,
    ],
    stuck: [
      ['If accidents stay frequent for a couple of weeks, go back to Step 1 for a while. Going back to diapers for a bit, with no blame, is fine too.', 'cps'],
    ],
  },
  r3: {
    why: [
      ['The aim now is for {name} to notice the feeling. Being reminded less is what makes room for that.', 'cps'],
    ],
    dos: [
      ['Stretch the timer by 15 minutes every few dry days.'],
      ['Before reminding, ask "What does your body say?" and wait a moment.'],
      ['Praise asking most of all.', 'cps'],
    ],
    donts: [
      ['Don\'t stretch the timer after a day of accidents: hold it, or shorten it.'],
      L_NOPUNISH,
    ],
    stuck: [
      ['Some children need the reminders for a long time. That\'s fine: keep the set times and try stretching again in a couple of weeks.', 'cps'],
    ],
  },
  r4: {
    why: [
      ['{name} now asks most of the time, and the set times shrink to the few that matter most.', 'cps'],
    ],
    dos: [
      ['Keep sits on waking, before nap and bed, and before outings and car trips.', 'cps', 'nhs'],
      ['Build independence: pants, wiping front to back, flushing, washing hands.', 'nhs', 'aapAge'],
      L_HANDS,
    ],
    donts: [
      ['Don\'t expect nights yet.', 'nhsBed'],
      ['Don\'t make much of the odd accident.', 'cps'],
    ],
    stuck: [
      ['If {name} isn\'t using the toilet after repeated tries by about 4, ask the pediatrician.', 'cps'],
    ],
  },
};
