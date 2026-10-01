/**
 * models/seed.js
 * ------------------------------------------------------------------
 * Seeds the JSON store with realistic DCT events + registrations.
 * Dates are computed relative to "today" so the demo always has
 * upcoming happenings and one past event.
 *
 * Run:  npm run seed        (no-op if data exists)
 *       npm run reset       (force reseed)
 * ------------------------------------------------------------------
 */
const Db = require('./db');
const Event = require('./Event');
const Registration = require('./Registration');
const { PATHS } = require('../config/constants');

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const EVENT_SEEDS = [
  {
    code: 'GRAD2026',
    title: 'Baccalaureate Mass & Graduation Exercises 2026',
    description:
      'A solemn Thanksgiving Mass followed by the Recognition Rites and Graduation Exercises for the Class of 2026, presided over by our beloved Bishop and College President.',
    venue: 'DCT Covered Court',
    date: isoDate(-40),
    timeStart: '08:00',
    timeEnd: '12:00',
    capacity: 400,
    registrationOpen: false,
    organizer: 'Office of the Registrar',
    contactEmail: 'registrar@dct.edu.ph',
  },
  {
    code: 'FOUND2026',
    title: "Founders' Week — 80th Founding Anniversary",
    description:
      'Celebrate eight decades of Dominican education in Capas, Tarlac. Campus fair, alumni homecoming, cultural presentations and a thanksgiving program honoring the vision of Fr. Mariano M. Sablay.',
    venue: 'DCT Quadrangle',
    date: isoDate(12),
    timeStart: '09:00',
    timeEnd: '17:00',
    capacity: 500,
    registrationOpen: true,
    organizer: 'Office of Student Affairs and Services',
    contactEmail: 'osas@dct.edu.ph',
  },
  {
    code: 'INTRAMR26',
    title: 'DCT Intramurals 2026 — The Dominican Games',
    description:
      'The annual inter-department sports festival. Basketball, volleyball, badminton, chess and the famous cheering competition. Come cheer for your college!',
    venue: 'DCT Gymnasium',
    date: isoDate(21),
    timeStart: '08:00',
    timeEnd: '18:00',
    capacity: 240,
    registrationOpen: true,
    organizer: 'Office of Student Affairs and Services',
    contactEmail: 'osas@dct.edu.ph',
  },
  {
    code: 'UGNAYAN',
    title: 'UGNAYAN 2026 — Internationalization Week',
    description:
      'The Internationalization Affairs Office invites students and faculty to a week of global conversations: MOA signings, benchmark talks with partner universities, and cultural exchanges.',
    venue: 'DCT Audio-Visual Room',
    date: isoDate(35),
    timeStart: '09:00',
    timeEnd: '16:00',
    capacity: 120,
    registrationOpen: true,
    organizer: 'Internationalization Affairs Office',
    contactEmail: 'international@dct.edu.ph',
  },
  {
    code: 'CSTECH',
    title: 'CCS Tech Summit & Hackathon 2026',
    description:
      'A day of talks, workshop tracks and a 6-hour coding jam organized by the College of Computer Studies. Prizes for the most innovative student projects.',
    venue: 'CCS Computer Laboratory',
    date: isoDate(49),
    timeStart: '08:00',
    timeEnd: '20:00',
    capacity: 80,
    registrationOpen: true,
    organizer: 'College of Computer Studies',
    contactEmail: 'ccs@dct.edu.ph',
  },
  {
    code: 'EMMAUS26',
    title: 'Seminar: On the Road to Emmaus',
    description:
      'A faith formation seminar walking through the Emmaus narrative — listening, understanding, and encountering Christ in the journey of life and community.',
    venue: 'DCT Chapel Hall',
    date: isoDate(60),
    timeStart: '13:00',
    timeEnd: '17:00',
    capacity: 90,
    registrationOpen: true,
    organizer: 'Campus Ministry Office',
    contactEmail: 'ministry@dct.edu.ph',
  },
  {
    code: 'CAROL26',
    title: 'Christmas Cantata & Carols 2026',
    description:
      'The community Christmas tradition — chorale performances, lighting of the tree, and carols in the lantern-lit quadrangle.',
    venue: 'DCT Quadrangle',
    date: isoDate(82),
    timeStart: '18:00',
    timeEnd: '21:30',
    capacity: 400,
    registrationOpen: true,
    organizer: 'Office of Student Affairs and Services',
    contactEmail: 'osas@dct.edu.ph',
  },
];

const REG_SEEDS = [
  { eventCode: 'INTRAMR26', fullName: 'Juan Miguel Dela Cruz', email: 'jm.delacruz@dct.edu.ph', phone: '09171234567', studentId: '2023-1142', department: 'College of Computer Studies', yearLevel: '3rd Year College' },
  { eventCode: 'INTRAMR26', fullName: 'Maria Corazon Santos', email: 'mc.santos@dct.edu.ph', phone: '09182345678', studentId: '2022-0893', department: 'College of Education', yearLevel: '4th Year College' },
  { eventCode: 'INTRAMR26', fullName: 'Janine Reyes', email: 'janine.reyes@dct.edu.ph', phone: '09193456789', studentId: '2024-2210', department: 'Senior High School Department', yearLevel: 'Senior High School' },
  { eventCode: 'INTRAMR26', fullName: 'Alberto Mendoza', email: 'alberto.mendoza@dct.edu.ph', phone: '09174567890', studentId: '', department: 'College of Business and Accountancy', yearLevel: 'Faculty / Staff' },
  { eventCode: 'FOUND2026', fullName: 'Cristina Bautista', email: 'cristina.bautista@dct.edu.ph', phone: '09201234567', studentId: '2026-0041', department: 'College of Liberal Arts', yearLevel: '1st Year College' },
  { eventCode: 'UGNAYAN', fullName: 'Emmanuel Torres', email: 'emmanuel.torres@dct.edu.ph', phone: '09198765432', studentId: '2023-0991', department: 'College of Humanities and Social Sciences', yearLevel: '3rd Year College' },
  { eventCode: 'CSTECH', fullName: 'Kyla Anne Pascual', email: 'kyla.pascual@dct.edu.ph', phone: '09185554433', studentId: '2024-1056', department: 'College of Computer Studies', yearLevel: '2nd Year College' },
  { eventCode: 'CSTECH', fullName: 'Gabriel Navarro', email: 'gabriel.navarro@dct.edu.ph', phone: '09186667788', studentId: '2023-1023', department: 'College of Computer Studies', yearLevel: '3rd Year College' },
];

async function main() {
  const db = new Db(PATHS.dataDir);
  await db.init();

  const force = process.argv.includes('--force');
  const already = await db.all('events');
  if (already.length && !force) {
    console.log('✔ Data already present — use "npm run reset" to reseed.');
    return;
  }

  await db.replace('events', []);
  await db.replace('registrations', []);

  // Resolve the model circular composition (each model needs the other).
  const eventModel = new Event(null);
  const regModel = new Registration(eventModel);
  eventModel.regModel = regModel;

  for (const seed of EVENT_SEEDS) {
    const { ok, errors } = await eventModel.create(seed);
    if (!ok) {
      console.error('✖ Failed to seed event:', seed.code, errors);
      process.exitCode = 1;
      return;
    }
  }

  const events = await eventModel.list();
  const byCode = Object.fromEntries(events.map((e) => [e.code, e]));

  let created = 0;
  for (const reg of REG_SEEDS) {
    const event = byCode[reg.eventCode];
    if (!event) continue;
    const { ok, errors } = await regModel.create({ ...reg, eventId: String(event.id) });
    if (!ok) {
      console.error('✖ Failed to seed registration for', reg.eventCode, errors);
      continue;
    }
    created += 1;
  }

  console.log(
    `✔ Seeded ${events.length} events and ${created} registrations. ` +
    `Files written to data/events.json and data/registrations.json`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});