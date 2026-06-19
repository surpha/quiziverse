/**
 * Space-related fun facts keyed by streak number.
 * Multiple facts per number for variety.
 * Falls back to generic facts for numbers without specific entries.
 */
const streakFacts = {
  1: [
    "Earth is the only known planet with 1 moon that supports life.",
    "Light from the Sun takes ~8 minutes to travel 1 AU to Earth.",
    "There is 1 known star at the center of our solar system.",
    "The Sun makes up 99.86% of all mass in our solar system — it's the 1 thing holding everything together.",
    "Mercury is the 1 planet that has no moons at all.",
    "The first artificial satellite, Sputnik 1, orbited Earth in just 96 minutes.",
    "There's only 1 natural satellite visible to the naked eye from Earth — our Moon.",
    "The Milky Way has 1 supermassive black hole at its center: Sagittarius A*.",
    "Neil Armstrong was the 1st human to set foot on the Moon.",
    "A single teaspoon of a neutron star would weigh about 6 billion tons.",
  ],
  2: [
    "Mars has 2 moons — Phobos and Deimos (Fear and Dread in Greek).",
    "Binary star systems have 2 stars orbiting each other.",
    "Voyager 2 is only the 2nd human-made object to leave the solar system.",
    "There are 2 Van Allen radiation belts surrounding Earth.",
    "Saturn's rings have 2 main gaps: the Cassini Division and the Encke Gap.",
    "Only 2 planets in our solar system have no moons: Mercury and Venus.",
    "The Sun will become a red giant in about 2 billion years (give or take 3).",
    "Earth rotates about 2 milliseconds slower every century.",
    "Pluto has 2 large features: the heart-shaped Tombaugh Regio and the whale-shaped Cthulhu Macula.",
    "There are 2 types of planets: terrestrial (rocky) and Jovian (gas/ice giants).",
  ],
  3: [
    "Orion's Belt is made of 3 bright stars in a row: Alnitak, Alnilam, Mintaka.",
    "A neutron star can spin over 700 times per second — some pulse 3+ times.",
    "There are 3 main types of galaxies: spiral, elliptical, and irregular.",
    "Apollo missions took about 3 days to travel from Earth to the Moon.",
    "The 3 largest moons in the solar system are Ganymede, Titan, and Callisto.",
    "Mars's Olympus Mons is about 3 times the height of Mt. Everest.",
    "Light takes about 3 minutes to travel from the Sun to Mercury.",
    "The Big Bang happened approximately 13.8 billion years ago — that's a 3 at the end!",
    "There are 3 main regions of the Sun: core, radiative zone, and convective zone.",
    "SpaceX's Falcon Heavy uses 3 rocket boosters for launch.",
  ],
  4: [
    "Jupiter has 4 large Galilean moons: Io, Europa, Ganymede, Callisto.",
    "There are 4 rocky planets in our solar system: Mercury, Venus, Earth, Mars.",
    "The Cassini spacecraft took almost 4 years to reach Saturn.",
    "A year on Mars is about 687 Earth days — roughly 4/7 of 2 Earth years.",
    "There are 4 gas/ice giants: Jupiter, Saturn, Uranus, Neptune.",
    "The Sun is about 4.6 billion years old — middle-aged for a star.",
    "The Great Red Spot on Jupiter is about 4× wider than Earth.",
    "Voyager 1 is about 4 light-hours from the Sun and still going.",
    "The Moon is about 4.5 billion years old, formed by a Mars-sized impact.",
    "There are 4 main layers in the Sun's atmosphere: photosphere, chromosphere, transition region, corona.",
  ],
  5: [
    "The observable universe is about 5% ordinary matter, 27% dark matter, 68% dark energy.",
    "There are 5 officially recognized dwarf planets: Pluto, Eris, Makemake, Haumea, Ceres.",
    "A day on Jupiter lasts only about 10 hours — spinning 5 times faster than Earth per day.",
    "The asteroid belt is roughly 5 AU from the Sun.",
    "There are 5 Lagrange points between any two orbiting bodies.",
    "The Space Shuttle program completed 5 different orbiters.",
    "Saturn is about 5 times farther from the Sun than Jupiter (9.5 AU vs ~5.2 AU).",
    "The ISS has been visited by astronauts from over 5 different space agencies.",
    "Venus takes about 5 months to cross the sky as the 'evening star.'",
    "The Parker Solar Probe will get within 5 million miles of the Sun's surface.",
  ],
  6: [
    "Saturn's north pole has a mysterious hexagonal storm with 6 sides.",
    "The Hubble Space Telescope orbits at about 6.9 km/s.",
    "There are about 6,000 stars visible to the naked eye from Earth (3,000 per hemisphere).",
    "The Moon is about 6 times smaller than Earth in diameter.",
    "A space suit has about 6 layers of material for protection.",
    "Mercury completes about 6 orbits for every 2 of Venus (a 3:1 resonance roughly).",
    "The Space Shuttle weighed about 6 million pounds at launch.",
    "Jupiter's magnetic field is about 6 times stronger at its poles than Earth's field.",
    "The footprints on the Moon will last for about 6 million years (no wind!).",
    "NASA's Artemis program aims to land the first woman and next man on the Moon — over 60 years after Apollo.",
  ],
  7: [
    "The Big Dipper asterism has 7 main stars that form a ladle shape.",
    "Apollo 7 was the first crewed Apollo mission to orbit Earth.",
    "A week has 7 days — named after 7 celestial bodies known to ancient astronomers.",
    "The TRAPPIST-1 system has 7 Earth-sized planets.",
    "Saturn's rings are divided into 7 main groups (A through G).",
    "Light from the nearest star (Proxima Centauri) takes about 4.24 years — just under 7 × 10^12 km.",
    "The Challenger disaster happened 73 seconds into flight — about 7 decades into the space age.",
    "Mercury's surface temperature varies by about 700°C between day and night.",
    "There have been 7 successful Mars rover missions so far.",
    "A total solar eclipse can last up to about 7.5 minutes.",
  ],
  8: [
    "There are 8 planets in our solar system since Pluto's reclassification in 2006.",
    "The ISS orbits Earth about 16 times a day — that's 8 times per workday.",
    "Neptune was the 8th planet discovered and takes 165 years to orbit the Sun.",
    "The speed of light is about 3 × 10^8 meters per second.",
    "The first 8 minutes of sunlight you see already left the Sun before you woke up.",
    "A photon at the Sun's core takes up to 8 million years to reach the surface, then 8 minutes to reach us.",
    "There are 88 official constellations — that's 8 × 11!",
    "The Moon's gravity is about ⅙ of Earth's — astronauts could jump 8× higher there (roughly).",
    "Venus is about 0.8 AU from the Sun — the closest planet to Earth's orbit.",
    "Mars has seasons lasting about 8 months each (its year is ~23 months).",
  ],
  9: [
    "Pluto was considered the 9th planet for 76 years (1930–2006).",
    "The Sun is about 9 billion years younger than the Milky Way.",
    "Saturn's moon Titan has 9 times more liquid hydrocarbons than all of Earth's oil reserves.",
    "The lunar maria (seas) cover about 9% of the Moon's far side vs 31% of the near side.",
    "Jupiter's moon Io has over 90 active volcanoes — the most geologically active body in the solar system.",
    "A spacecraft at escape velocity leaves Earth at about 9 miles per second.",
    "The Kuiper Belt starts at about 9 billion km from the Sun.",
    "Mars's gravity is about 9/25ths of Earth's.",
    "The deepest crater on the Moon (South Pole-Aitken) is about 9 km deep.",
    "Our galaxy is moving toward the Great Attractor at about 900,000 mph.",
  ],
  10: [
    "The Sun will exhaust its hydrogen fuel in about 10 billion years total (5 left).",
    "There are an estimated 10 billion trillion (10^22) stars in the observable universe.",
    "Astronauts on the ISS see about 16 sunrises per day — one roughly every 10 × 9 minutes.",
    "The solar wind travels at about 1 million mph — reaching Earth in about 10 × 15 hours.",
    "The Oort Cloud is estimated to start at about 10,000 AU from the Sun.",
    "A black hole with 10 solar masses would have an event horizon only 60 km across.",
    "Halley's Comet returns approximately every 10 × 7.5 years.",
    "The first 10 people to walk on the Moon all did so between 1969 and 1972.",
    "Jupiter is about 10 times wider than Earth.",
    "There are over 10,000 known near-Earth objects being tracked.",
  ],
  11: [
    "Apollo 11 was the first mission to land humans on the Moon (July 20, 1969).",
    "The Sun's magnetic activity cycle is roughly 11 years.",
    "Proxima Centauri b completes an orbit in about 11 Earth days.",
    "The Andromeda Galaxy is about 11 billion years old.",
    "Saturn's moon Enceladus is only about 500 km wide — 1/11th of our Moon.",
    "The first space station (Salyut 1) orbited for about 11 weeks before re-entry.",
    "There are 11 main cloud bands on Jupiter visible from Earth.",
    "Mars's tallest volcano (Olympus Mons) last erupted about 11 million years ago (estimated).",
    "The Hubble Ultra Deep Field captured light from galaxies 11+ billion light-years away.",
    "Light travels about 11 million km per hour — that's Earth to the Moon in 1.3 seconds.",
  ],
  12: [
    "Only 12 humans have ever walked on the Moon (all American, all between 1969–1972).",
    "Jupiter takes about 12 Earth years to complete one orbit around the Sun.",
    "The zodiac has 12 constellations along the ecliptic.",
    "The Voyager Golden Record contains greetings in 12 × 4+ = 55 languages.",
    "A day on Venus is about 12 times longer than a Venus year... wait, no — a Venus day is 243 Earth days, its year is 225.",
    "The ISS is about 12 stories tall (109 meters end to end).",
    "The first 12 shuttle missions all launched from the same pad (39A).",
    "Earth's core is about 12,000°F — as hot as the Sun's surface.",
    "Ganymede (Jupiter's largest moon) is about 12% wider than Mercury.",
    "There are roughly 12 full moons per year (sometimes 13).",
  ],
  13: [
    "Apollo 13 survived a near-disaster in space — 'Houston, we've had a problem.'",
    "The observable universe is about 13.8 billion years old.",
    "There are 13+ moons in the outer solar system larger than 1000 km across.",
    "A year on Jupiter is about 13 months longer than 11 Earth years.",
    "The first spacewalk lasted about 13 minutes (by Alexei Leonov, 1965).",
    "Titan is the 13th-largest body in the solar system overall.",
    "Mars's atmosphere is about 130 times thinner than Earth's (0.6% surface pressure).",
    "The Sun converts about 600 million tons of hydrogen per second — for 13 × 10^9 years total.",
    "Voyager 1 is over 13 billion miles from Earth.",
    "There are 13 confirmed rings around Uranus.",
  ],
  14: [
    "A full lunar cycle from new moon to new moon takes about 29.5 days (~14 × 2).",
    "The ISS has been continuously occupied since November 2000 — over 14,000+ days.",
    "The first Moon landing was in 1969 — about 14 years after the space race began with Sputnik.",
    "Mars's two moons are so small they'd fit inside a city — Phobos is only 14 miles across.",
    "The furthest galaxy observed is about 14 billion light-years away.",
    "A solar flare can release energy equivalent to 14 billion nuclear bombs.",
    "Saturn's rings are only about 14 meters thick on average despite being 280,000 km wide.",
    "The cosmic microwave background radiation is about 14 billion years old.",
    "There have been about 14 successful soft landings on Mars.",
    "The Sun's core temperature is about 14 million °C.",
  ],
  15: [
    "The ISS travels at about 15 times the speed of a bullet (28,000 km/h).",
    "Saturn's rings extend up to 15 planetary radii from its center.",
    "It takes light about 15 hours to cross Pluto's orbit diameter.",
    "There have been about 150+ planetary moons discovered in our solar system.",
    "The Mars Curiosity rover has traveled over 15 miles since landing in 2012.",
    "The closest black hole to Earth is about 1,500 light-years away.",
    "The Great Wall of China is NOT visible from space, but city lights at night are — from 150+ miles up.",
    "A comet's tail can stretch over 150 million km — longer than Earth-Sun distance.",
    "The Milky Way's disk is about 1,500 light-years thick.",
    "Jupiter's Great Red Spot has been raging for at least 150+ years.",
  ],
  21: [
    "The Milky Way is about 21 kiloparsecs across (roughly 68,000 light-years).",
    "Sputnik 1 orbited for 21 days before its batteries ran out.",
    "The first space shuttle flew 21 years before the ISS was completed.",
  ],
  28: [
    "The Moon completes one orbit around Earth in about 28 days.",
    "28 astronauts flew on the first 7 Mercury & Gemini missions combined.",
    "A lunar month is ~28 days — matching many ancient calendars.",
  ],
  30: [
    "Light takes about 30 minutes to travel from the Sun to Jupiter.",
    "The Hubble telescope has been in orbit for 30+ years.",
    "Saturn takes about 30 years to orbit the Sun.",
  ],
  50: [
    "Voyager 1 has been traveling for 50+ years since 1977.",
    "The speed of the ISS is about 50 times faster than a jet.",
    "A photon from the center of the Sun takes ~50,000 years to reach the surface.",
  ],
  60: [
    "The space age is now ~60+ years old (started 1957).",
    "Venus rotates so slowly that a day there lasts ~60× longer than Earth's.",
    "Over 60 robotic missions have been sent to Mars.",
  ],
  100: [
    "There are over 100 billion galaxies in the observable universe.",
    "The Kármán line (edge of space) is 100 km above sea level.",
    "Jupiter has over 100 known moons.",
  ],
  365: [
    "Earth completes 1 orbit around the Sun in ~365 days. Full circle!",
    "You've matched Earth's orbit — a complete journey around your star!",
    "365 days = 1 astronomical year. You're a true cosmic constant.",
  ],
}

/**
 * Generic facts for numbers without specific entries.
 * Uses the number in a space context.
 */
const genericFacts = [
  (n) => `You've orbited the Quiziverse ${n} times — that's ${n} days of cosmic curiosity!`,
  (n) => `${n} consecutive days! The ISS has completed ~${n * 16} orbits in the same time.`,
  (n) => `At ${n} days, light has traveled ${(n * 26).toLocaleString()} billion km since you started.`,
  (n) => `${n}-day streak! A spacecraft at light speed would be ${(n * 0.0027).toFixed(2)} light-years from Earth by now.`,
  (n) => `${n} orbits strong — the Hubble has taken about ${n * 13} photos in the same timeframe.`,
  (n) => `${n} days of quizzing is more consistent than most comets' orbits!`,
  (n) => `Fun fact: in ${n} days, Mars has rotated ${n} times (its day is almost the same as Earth's).`,
  (n) => `${n} consecutive days! That's ${(n * 24 * 60).toLocaleString()} minutes of being a stellar learner.`,
  (n) => `In ${n} days, the Earth has traveled ${(n * 2.57).toFixed(0)} million km around the Sun.`,
  (n) => `${n} days! The Voyager probes have moved ${(n * 1.5).toFixed(0)} million km further into interstellar space since you started.`,
  (n) => `${n}-day streak — that's longer than most satellite missions in the 1960s lasted!`,
  (n) => `Your streak is ${n}! In the same time, Jupiter's Great Red Spot has rotated ${Math.round(n * 2.4)} times.`,
  (n) => `${n} days of cosmic knowledge — the Moon has orbited ${(n / 27.3).toFixed(1)} times around Earth since you began.`,
  (n) => `At ${n} days, you've been quizzing longer than the entire Gemini space program's flight time!`,
  (n) => `${n} consecutive days! A radio signal from Earth has traveled ${(n * 26).toLocaleString()} billion km into space since your streak started.`,
  (n) => `${n} orbits! If each quiz was a star, you'd have your own small constellation by now.`,
]

/**
 * Get a random space fact for the given streak number.
 * Prefers number-specific facts, falls back to generic.
 */
export function getStreakFact(streakNumber) {
  if (streakNumber <= 0) return null

  // Check for exact match first
  if (streakFacts[streakNumber]) {
    const facts = streakFacts[streakNumber]
    return facts[Math.floor(Math.random() * facts.length)]
  }

  // Use generic facts with the number interpolated
  const gen = genericFacts[Math.floor(Math.random() * genericFacts.length)]
  return gen(streakNumber)
}

/**
 * Get streak milestone emoji based on streak length.
 */
export function getStreakEmoji(streak) {
  if (streak >= 365) return '🪐'
  if (streak >= 100) return '🌌'
  if (streak >= 60) return '💫'
  if (streak >= 30) return '🌟'
  if (streak >= 14) return '☄️'
  if (streak >= 7) return '🔥'
  if (streak >= 3) return '✨'
  if (streak >= 1) return '⚡'
  return ''
}

/**
 * Get streak milestone label.
 */
export function getStreakLabel(streak) {
  if (streak >= 365) return 'Planetary'
  if (streak >= 100) return 'Galactic'
  if (streak >= 60) return 'Nebula'
  if (streak >= 30) return 'Supernova'
  if (streak >= 14) return 'Constellation'
  if (streak >= 7) return 'Comet'
  if (streak >= 3) return 'Shooting Star'
  if (streak >= 1) return 'Spark'
  return ''
}
