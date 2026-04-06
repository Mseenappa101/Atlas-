import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const FIRMS_PATH = join(OUTPUT_DIR, 'firms.json');
const ERRORS_PATH = join(OUTPUT_DIR, 'errors.json');

const client = new Anthropic({ apiKey: process.env.VITE_ANTHROPIC_API_KEY });

// ─── FIRMS TO SCRAPE ─────────���──────────────────────────────────────────────
// Add more firms by appending objects with { name, state, city, careers_url }.
// The scraper will visit each careers_url, extract text, and use Claude to
// parse recruiting info. Run with: node scripts/scraper.js
const FIRMS_TO_SCRAPE = [
  { name: "Skadden Arps", state: "NY", city: "New York", careers_url: "https://www.skadden.com/careers" },
  { name: "Kirkland & Ellis", state: "IL", city: "Chicago", careers_url: "https://www.kirkland.com/careers" },
  { name: "Latham & Watkins", state: "CA", city: "Los Angeles", careers_url: "https://www.lw.com/careers" },
  { name: "Davis Polk", state: "NY", city: "New York", careers_url: "https://www.davispolk.com/careers" },
  { name: "Sullivan & Cromwell", state: "NY", city: "New York", careers_url: "https://www.sullcrom.com/careers" },
  { name: "Simpson Thacher", state: "NY", city: "New York", careers_url: "https://www.stblaw.com/careers" },
  { name: "Cravath Swaine", state: "NY", city: "New York", careers_url: "https://www.cravath.com/careers" },
  { name: "Paul Weiss", state: "NY", city: "New York", careers_url: "https://www.paulweiss.com/careers" },
  { name: "Cleary Gottlieb", state: "NY", city: "New York", careers_url: "https://www.clearygottlieb.com/careers" },
  { name: "Gibson Dunn", state: "CA", city: "Los Angeles", careers_url: "https://www.gibsondunn.com/careers" },
  { name: "Jones Day", state: "OH", city: "Cleveland", careers_url: "https://www.jonesday.com/careers" },
  { name: "Sidley Austin", state: "IL", city: "Chicago", careers_url: "https://www.sidley.com/careers" },
  { name: "King & Spalding", state: "GA", city: "Atlanta", careers_url: "https://www.kslaw.com/careers" },
  { name: "Alston & Bird", state: "GA", city: "Atlanta", careers_url: "https://www.alston.com/careers" },
  { name: "Bradley Arant", state: "AL", city: "Birmingham", careers_url: "https://www.bradley.com/careers" },
  { name: "Bass Berry & Sims", state: "TN", city: "Nashville", careers_url: "https://www.bassberry.com/careers" },
  { name: "Baker Donelson", state: "TN", city: "Memphis", careers_url: "https://www.bakerdonelson.com/careers" },
  { name: "Holland & Knight", state: "FL", city: "Miami", careers_url: "https://www.hklaw.com/careers" },
  { name: "Greenberg Traurig", state: "FL", city: "Miami", careers_url: "https://www.gtlaw.com/careers" },
  { name: "Hunton Andrews Kurth", state: "VA", city: "Richmond", careers_url: "https://www.huntonak.com/careers" },
  { name: "Morgan Lewis", state: "PA", city: "Philadelphia", careers_url: "https://www.morganlewis.com/careers" },
  { name: "Dechert", state: "PA", city: "Philadelphia", careers_url: "https://www.dechert.com/careers" },
  { name: "Baker McKenzie", state: "IL", city: "Chicago", careers_url: "https://www.bakermckenzie.com/careers" },
  { name: "Maynard Nexsen", state: "AL", city: "Birmingham", careers_url: "https://www.maynardnexsen.com/careers" },
  { name: "Burr & Forman", state: "AL", city: "Birmingham", careers_url: "https://www.burr.com/careers" },

  // ─── ATLANTA, GA ────────────────────────────────────────────────────────────
  { name: "Arnall Golden Gregory", state: "GA", city: "Atlanta", careers_url: "https://www.agg.com/careers/summer-associate-program/" },
  { name: "Morris Manning & Martin", state: "GA", city: "Atlanta", careers_url: "https://www.mmmlaw.com/careers/" },
  { name: "Chamberlain Hrdlicka", state: "GA", city: "Atlanta", careers_url: "https://www.chamberlainlaw.com/careers-associates.html" },
  { name: "FordHarrison", state: "GA", city: "Atlanta", careers_url: "https://www.fordharrison.com/careers.aspx" },
  { name: "Swift Currie McGhee & Hiers", state: "GA", city: "Atlanta", careers_url: "https://www.swiftcurrie.com/careers-summer-program" },
  { name: "Drew Eckl & Farnham", state: "GA", city: "Atlanta", careers_url: "https://www.deflaw.com/career/summer-associates/" },
  { name: "Stites & Harbison", state: "GA", city: "Atlanta", careers_url: "https://www.stites.com/about/careers/law-students/" },
  { name: "Balch & Bingham", state: "GA", city: "Atlanta", careers_url: "https://www.balch.com/careers/lawstudents" },
  { name: "Hawkins Parnell & Young", state: "GA", city: "Atlanta", careers_url: "https://www.hpylaw.com/" },
  { name: "Smith Gambrell & Russell", state: "GA", city: "Atlanta", careers_url: "https://www.sgrlaw.com/careers/" },

  // ─── DALLAS, TX ─────────────────────────────────────────────────────────────
  { name: "Gray Reed", state: "TX", city: "Dallas", careers_url: "https://www.grayreed.com/Careers" },
  { name: "Munsch Hardt", state: "TX", city: "Dallas", careers_url: "https://www.munsch.com/Careers" },
  { name: "Bell Nunnally", state: "TX", city: "Dallas", careers_url: "https://www.bellnunnally.com/career/careers/" },
  { name: "Winstead", state: "TX", city: "Dallas", careers_url: "https://www.winstead.com/Careers/Law-Students" },
  { name: "Thompson Coe", state: "TX", city: "Dallas", careers_url: "https://www.thompsoncoe.com/firm/careers/" },
  { name: "Kane Russell Coleman Logan", state: "TX", city: "Dallas", careers_url: "https://www.krcl.com/careers/law-students" },
  { name: "Wick Phillips", state: "TX", city: "Dallas", careers_url: "https://www.wickphillips.com/careers/" },
  { name: "Scheef & Stone", state: "TX", city: "Dallas", careers_url: "https://solidcounsel.com/careers/" },
  { name: "Carrington Coleman", state: "TX", city: "Dallas", careers_url: "https://www.ccsb.com/our-firm/careers/" },
  { name: "Susman Godfrey", state: "TX", city: "Dallas", careers_url: "https://www.susmangodfrey.com/career/associate-hiring/" },

  // ─── HOUSTON, TX ────────────────────────────────────────────────────────────
  { name: "Porter Hedges", state: "TX", city: "Houston", careers_url: "https://www.porterhedges.com/careers-law-students" },
  { name: "Chamberlain Hrdlicka", state: "TX", city: "Houston", careers_url: "https://www.chamberlainlaw.com/careers-associates.html" },
  { name: "Bracewell", state: "TX", city: "Houston", careers_url: "https://www.bracewell.com/careers/law-students/" },
  { name: "Winstead", state: "TX", city: "Houston", careers_url: "https://www.winstead.com/Careers/Law-Students" },
  { name: "Gray Reed", state: "TX", city: "Houston", careers_url: "https://www.grayreed.com/Careers/Summer-Associates" },
  { name: "Munsch Hardt", state: "TX", city: "Houston", careers_url: "https://www.munsch.com/Careers/Summer-Associates" },
  { name: "Susman Godfrey", state: "TX", city: "Houston", careers_url: "https://www.susmangodfrey.com/career/summer-associate/" },
  { name: "AZA", state: "TX", city: "Houston", careers_url: "https://azalaw.com/careers/" },
  { name: "Kane Russell Coleman Logan", state: "TX", city: "Houston", careers_url: "https://www.krcl.com/careers/law-students" },
  { name: "McGinnis Lochridge", state: "TX", city: "Houston", careers_url: "https://www.mcginnislaw.com/careers-associates" },

  // ─── NASHVILLE, TN ──────────────────────────────────────────────────────────
  { name: "Stites & Harbison", state: "TN", city: "Nashville", careers_url: "https://www.stites.com/about/careers/law-students" },
  { name: "Miller & Martin", state: "TN", city: "Nashville", careers_url: "https://millermartin.com/careers/law-students/" },
  { name: "Lewis Thomason", state: "TN", city: "Nashville", careers_url: "https://www.lewisthomason.com/join-us/" },
  { name: "Sherrard Roe Voigt & Harbison", state: "TN", city: "Nashville", careers_url: "https://srvhlaw.com/the-firm/careers/" },
  { name: "Wyatt Tarrant & Combs", state: "TN", city: "Nashville", careers_url: "https://wyattfirm.com/careers/law-students/" },
  { name: "Butler Snow", state: "TN", city: "Nashville", careers_url: "https://www.butlersnow.com/careers/summer-program" },
  { name: "Frost Brown Todd", state: "TN", city: "Nashville", careers_url: "https://frostbrowntodd.com/careers/law-students/" },

  // ─── CHARLOTTE, NC ──────────────────────────────────────────────────────────
  { name: "Robinson Bradshaw", state: "NC", city: "Charlotte", careers_url: "https://www.robinsonbradshaw.com/careers/your-future-with-us-careers" },
  { name: "Parker Poe", state: "NC", city: "Charlotte", careers_url: "https://www.parkerpoe.com/careers" },
  { name: "Brooks Pierce", state: "NC", city: "Charlotte", careers_url: "https://www.brookspierce.com/careers" },
  { name: "Cranfill Sumner", state: "NC", city: "Charlotte", careers_url: "https://www.cshlaw.com/about/careers/" },
  { name: "Poyner Spruill", state: "NC", city: "Charlotte", careers_url: "https://www.poynerspruill.com/about/join-us/" },
  { name: "Johnston Allison & Hord", state: "NC", city: "Charlotte", careers_url: "https://www.jahlaw.com/careers/" },
  { name: "Shumaker Loop & Kendrick", state: "NC", city: "Charlotte", careers_url: "https://www.shumaker.com/company-overview/careers/" },
  { name: "Moore & Van Allen", state: "NC", city: "Charlotte", careers_url: "https://www.mvalaw.com/careers-working-at-mva" },

  // ─── RALEIGH, NC ────────────────────────────────────────────────────────────
  { name: "Smith Anderson", state: "NC", city: "Raleigh", careers_url: "https://www.smithlaw.com/careers/open-positions" },
  { name: "Brooks Pierce", state: "NC", city: "Raleigh", careers_url: "https://www.brookspierce.com/careers-careers" },
  { name: "Williams Mullen", state: "NC", city: "Raleigh", careers_url: "https://www.williamsmullen.com/careers" },
  { name: "Wyrick Robbins", state: "NC", city: "Raleigh", careers_url: "https://www.wyrick.com/careers" },
  { name: "Poyner Spruill", state: "NC", city: "Raleigh", careers_url: "https://www.poynerspruill.com/about/join-us/" },
  { name: "Ward and Smith", state: "NC", city: "Raleigh", careers_url: "https://www.wardandsmith.com/careers" },
  { name: "Cranfill Sumner", state: "NC", city: "Raleigh", careers_url: "https://www.cshlaw.com/about/careers/" },
  { name: "Parker Poe", state: "NC", city: "Raleigh", careers_url: "https://www.parkerpoe.com/careers" },

  // ─── MIAMI, FL ──────────────────────────────────────────────────────────────
  { name: "Shutts & Bowen", state: "FL", city: "Miami", careers_url: "https://www.shutts.com/about-careers" },
  { name: "Akerman", state: "FL", city: "Miami", careers_url: "https://www.akerman.com/en/people/careers.html" },
  { name: "Carlton Fields", state: "FL", city: "Miami", careers_url: "https://www.carltonfields.com/careers" },
  { name: "Bilzin Sumberg", state: "FL", city: "Miami", careers_url: "https://www.bilzin.com/careers" },
  { name: "Cole Scott & Kissane", state: "FL", city: "Miami", careers_url: "https://www.csklegal.com/careers/overview" },
  { name: "Berger Singerman", state: "FL", city: "Miami", careers_url: "https://www.bergersingerman.com/careers/with-us" },
  { name: "Stearns Weaver Miller", state: "FL", city: "Miami", careers_url: "https://www.stearnsweaver.com/careers/" },
  { name: "Kelley Kronenberg", state: "FL", city: "Miami", careers_url: "https://www.kelleykronenberg.com/summer-associate-program/" },
  { name: "GrayRobinson", state: "FL", city: "Miami", careers_url: "https://www.gray-robinson.com/careers" },
  { name: "Buchanan Ingersoll & Rooney", state: "FL", city: "Miami", careers_url: "https://www.bipc.com/careers/" },

  // ─── TAMPA, FL ──────────────────────────────────────────────────────────────
  { name: "Hill Ward Henderson", state: "FL", city: "Tampa", careers_url: "https://www.hwhlaw.com/careers-summer-associate-program" },
  { name: "Carlton Fields", state: "FL", city: "Tampa", careers_url: "https://www.carltonfields.com/careers" },
  { name: "Shumaker Loop & Kendrick", state: "FL", city: "Tampa", careers_url: "https://www.shumaker.com/company-overview/careers/" },
  { name: "Trenam Law", state: "FL", city: "Tampa", careers_url: "https://www.trenam.com/careers/" },
  { name: "Bush Ross", state: "FL", city: "Tampa", careers_url: "https://www.bushross.com/recruiting-summer.html" },
  { name: "Banker Lopez Gassler", state: "FL", city: "Tampa", careers_url: "https://www.bankerlopez.com/careers/" },
  { name: "Gunster", state: "FL", city: "Tampa", careers_url: "https://www.gunster.com/careers/law-students" },
  { name: "Adams & Reese", state: "FL", city: "Tampa", careers_url: "https://www.adamsandreese.com/careers" },

  // ─── BIRMINGHAM, AL ─────────────────────────────────────────────────────────
  { name: "Balch & Bingham", state: "AL", city: "Birmingham", careers_url: "https://www.balch.com/careers" },
  { name: "Lightfoot Franklin & White", state: "AL", city: "Birmingham", careers_url: "https://www.lightfootlaw.com/careers/law-students" },
  { name: "Starnes Davis Florie", state: "AL", city: "Birmingham", careers_url: "https://www.starneslaw.com/who-we-are/careers/" },
  { name: "Carr Allison", state: "AL", city: "Birmingham", careers_url: "https://www.carrallison.com/careers/" },
  { name: "Christian & Small", state: "AL", city: "Birmingham", careers_url: "https://csattorneys.com/careers/" },
  { name: "Hand Arendall Harrison Sale", state: "AL", city: "Birmingham", careers_url: "https://www.handfirm.com/careers/" },
  { name: "Dentons Sirote", state: "AL", city: "Birmingham", careers_url: "https://www.dentons.com/en/careers/careers-in-the-united-states" },
  { name: "Adams & Reese", state: "AL", city: "Birmingham", careers_url: "https://www.adamsandreese.com/careers/law-students" },

  // ─── NEW ORLEANS, LA ────────────────────────────────────────────────────────
  { name: "Jones Walker", state: "LA", city: "New Orleans", careers_url: "https://www.joneswalker.com/en/careers/law-students.html" },
  { name: "Liskow & Lewis", state: "LA", city: "New Orleans", careers_url: "https://www.liskow.com/career/overview/" },
  { name: "Kean Miller", state: "LA", city: "New Orleans", careers_url: "https://www.keanmiller.com/careers/" },
  { name: "Phelps Dunbar", state: "LA", city: "New Orleans", careers_url: "https://www.phelps.com/careers/law-students/index.html" },
  { name: "Galloway Johnson", state: "LA", city: "New Orleans", careers_url: "https://gallowaylawfirm.com/careers/" },
  { name: "Deutsch Kerrigan", state: "LA", city: "New Orleans", careers_url: "https://www.deutschkerrigan.com/careers" },
  { name: "Breazeale Sachse & Wilson", state: "LA", city: "New Orleans", careers_url: "https://www.bswllp.com/careers" },
  { name: "Chaffe McCall", state: "LA", city: "New Orleans", careers_url: "https://www.chaffe.com/careers/summer-associates/" },

  // ─── DENVER, CO ─────────────────────────────────────────────────────────────
  { name: "Holland & Hart", state: "CO", city: "Denver", careers_url: "https://www.hollandhart.com/law-students" },
  { name: "Davis Graham & Stubbs", state: "CO", city: "Denver", careers_url: "https://davisgraham.com/careers/summer-law-clerks/" },
  { name: "Wheeler Trigg O'Donnell", state: "CO", city: "Denver", careers_url: "https://wtotrial.com/law-students" },
  { name: "Sherman & Howard", state: "CO", city: "Denver", careers_url: "https://www.shermanhoward.com/careers/law-students" },
  { name: "Brownstein Hyatt Farber Schreck", state: "CO", city: "Denver", careers_url: "https://www.bhfs.com/careers/law-students/" },
  { name: "Ireland Stapleton", state: "CO", city: "Denver", careers_url: "https://irelandstapleton.com/careers/" },
  { name: "Messner Reeves", state: "CO", city: "Denver", careers_url: "https://messner.com/careers/" },
  { name: "Husch Blackwell", state: "CO", city: "Denver", careers_url: "https://www.huschblackwell.com/careers/law-students" },
  { name: "Armstrong Teasdale", state: "CO", city: "Denver", careers_url: "https://www.armstrongteasdale.com/careers/law-students/" },
  { name: "Polsinelli", state: "CO", city: "Denver", careers_url: "https://www.polsinelli.com/careers/law-student-recruiting" },

  // ─── PHOENIX, AZ ────────────────────────────────────────────────────────────
  { name: "Snell & Wilmer", state: "AZ", city: "Phoenix", careers_url: "https://www.swlaw.com/careers/law-students/" },
  { name: "Fennemore Craig", state: "AZ", city: "Phoenix", careers_url: "https://www.fennemorelaw.com/careers/students/" },
  { name: "Lewis Roca", state: "AZ", city: "Phoenix", careers_url: "https://www.lewisroca.com/careers-law-students" },
  { name: "Gallagher & Kennedy", state: "AZ", city: "Phoenix", careers_url: "https://gknet.com/careers/summer-program/" },
  { name: "Osborn Maledon", state: "AZ", city: "Phoenix", careers_url: "https://www.omlaw.com/careers/attorney-recruiting/" },
  { name: "Quarles & Brady", state: "AZ", city: "Phoenix", careers_url: "https://www.quarles.com/careers/law-students" },
  { name: "Ballard Spahr", state: "AZ", city: "Phoenix", careers_url: "https://www.ballardspahr.com/careers/law-students" },
  { name: "Tiffany & Bosco", state: "AZ", city: "Phoenix", careers_url: "https://www.tblaw.com/careers/" },
  { name: "Dickinson Wright", state: "AZ", city: "Phoenix", careers_url: "https://www.dickinson-wright.com/careers" },
  { name: "Gust Rosenfeld", state: "AZ", city: "Phoenix", careers_url: "https://www.gustlaw.com/who-we-are/careers/" },

  // ─── SEATTLE, WA ────────────────────────────────────────────────────────────
  { name: "Foster Garvey", state: "WA", city: "Seattle", careers_url: "https://www.foster.com/careers" },
  { name: "Schwabe Williamson & Wyatt", state: "WA", city: "Seattle", careers_url: "https://www.schwabe.com/client-commitment/careers/" },
  { name: "Lane Powell", state: "WA", city: "Seattle", careers_url: "https://www.lanepowell.com/Our-Careers" },
  { name: "Miller Nash", state: "WA", city: "Seattle", careers_url: "https://www.millernash.com/careers" },
  { name: "Hillis Clark Martin & Peterson", state: "WA", city: "Seattle", careers_url: "https://www.hcmp.com/careers" },
  { name: "Pacifica Law Group", state: "WA", city: "Seattle", careers_url: "https://www.pacificalawgroup.com/careers/" },
  { name: "Ogden Murphy Wallace", state: "WA", city: "Seattle", careers_url: "https://www.omwlaw.com/careers" },
  { name: "Stoel Rives", state: "WA", city: "Seattle", careers_url: "https://www.stoel.com/careers/law-students" },

  // ─── MINNEAPOLIS, MN ────────────────────────────────────────────────────────
  { name: "Robins Kaplan", state: "MN", city: "Minneapolis", careers_url: "https://www.robinskaplan.com/careers" },
  { name: "Maslon", state: "MN", city: "Minneapolis", careers_url: "https://www.maslon.com/careers" },
  { name: "Winthrop & Weinstine", state: "MN", city: "Minneapolis", careers_url: "https://winthrop.com/careers/" },
  { name: "Merchant & Gould", state: "MN", city: "Minneapolis", careers_url: "https://www.merchantgould.com/Careers" },
  { name: "Fredrikson & Byron", state: "MN", city: "Minneapolis", careers_url: "https://www.fredlaw.com/careers-law-students" },
  { name: "Lathrop GPM", state: "MN", city: "Minneapolis", careers_url: "https://www.lathropgpm.com/careers-students.html" },
  { name: "Larkin Hoffman", state: "MN", city: "Minneapolis", careers_url: "https://www.larkinhoffman.com/careers" },
  { name: "Felhaber Larson", state: "MN", city: "Minneapolis", careers_url: "https://www.felhaber.com/home/careers/" },
  { name: "Stinson", state: "MN", city: "Minneapolis", careers_url: "https://www.stinson.com/careers-summer-associate-program" },

  // ─── KANSAS CITY, MO ────────────────────────────────────────────────────────
  { name: "Shook Hardy & Bacon", state: "MO", city: "Kansas City", careers_url: "https://www.shb.com/careers" },
  { name: "Polsinelli", state: "MO", city: "Kansas City", careers_url: "https://www.polsinelli.com/careers" },
  { name: "Lathrop GPM", state: "MO", city: "Kansas City", careers_url: "https://www.lathropgpm.com/careers.html" },
  { name: "Spencer Fane", state: "MO", city: "Kansas City", careers_url: "https://www.spencerfane.com/careers" },
  { name: "Husch Blackwell", state: "MO", city: "Kansas City", careers_url: "https://www.huschblackwell.com/careers" },
  { name: "Stinson", state: "MO", city: "Kansas City", careers_url: "https://www.stinson.com/careers" },
  { name: "Berkowitz Oliver", state: "MO", city: "Kansas City", careers_url: "https://www.berkowitzoliver.com/careers" },
  { name: "Seigfreid Bingham", state: "MO", city: "Kansas City", careers_url: "https://www.sb-kc.com/careers" },
  { name: "Graves Garrett", state: "MO", city: "Kansas City", careers_url: "https://www.gravesgarrett.com/careers" },
  { name: "Watson Ess", state: "MO", city: "Kansas City", careers_url: "https://www.watsoness.com/careers" },

  // ─── RICHMOND, VA ───────────────────────────────────────────────────────────
  { name: "McGuireWoods", state: "VA", city: "Richmond", careers_url: "https://www.mcguirewoods.com/careers" },
  { name: "Williams Mullen", state: "VA", city: "Richmond", careers_url: "https://www.williamsmullen.com/careers" },
  { name: "Troutman Pepper", state: "VA", city: "Richmond", careers_url: "https://www.troutman.com/careers.html" },
  { name: "Hirschler", state: "VA", city: "Richmond", careers_url: "https://www.hirschlerlaw.com/careers" },
  { name: "Spotts Fain", state: "VA", city: "Richmond", careers_url: "https://www.spottsfain.com/careers" },
  { name: "Sands Anderson", state: "VA", city: "Richmond", careers_url: "https://www.sandsanderson.com/careers" },
  { name: "Christian & Barton", state: "VA", city: "Richmond", careers_url: "https://www.cblaw.com/careers" },
  { name: "ThompsonMcMullan", state: "VA", city: "Richmond", careers_url: "https://www.t-mlaw.com/careers" },
  { name: "Gentry Locke", state: "VA", city: "Richmond", careers_url: "https://www.gentrylocke.com/careers" },
  { name: "Kaufman & Canoles", state: "VA", city: "Richmond", careers_url: "https://www.kaufcan.com/careers" },

  // ─── BALTIMORE, MD ──────────────────────────────────────────────────────────
  { name: "Venable", state: "MD", city: "Baltimore", careers_url: "https://www.venable.com/careers" },
  { name: "Miles & Stockbridge", state: "MD", city: "Baltimore", careers_url: "https://www.milesstockbridge.com/careers" },
  { name: "Saul Ewing", state: "MD", city: "Baltimore", careers_url: "https://www.saul.com/careers" },
  { name: "Gordon Feinblatt", state: "MD", city: "Baltimore", careers_url: "https://www.gfrlaw.com/careers" },
  { name: "Gallagher Evelius & Jones", state: "MD", city: "Baltimore", careers_url: "https://www.gejlaw.com/careers" },
  { name: "Tydings & Rosenberg", state: "MD", city: "Baltimore", careers_url: "https://www.tydings.com/careers" },
  { name: "Whiteford Taylor & Preston", state: "MD", city: "Baltimore", careers_url: "https://www.whitefordlaw.com/careers" },
  { name: "Rosenberg Martin Greenberg", state: "MD", city: "Baltimore", careers_url: "https://www.rosenbergmartin.com/careers" },
  { name: "Semmes Bowen & Semmes", state: "MD", city: "Baltimore", careers_url: "https://www.semmes.com/careers" },

  // ─── PITTSBURGH, PA ─────────────────────────────────────────────────────────
  { name: "Reed Smith", state: "PA", city: "Pittsburgh", careers_url: "https://www.reedsmith.com/en/careers" },
  { name: "Buchanan Ingersoll & Rooney", state: "PA", city: "Pittsburgh", careers_url: "https://www.bipc.com/careers" },
  { name: "Babst Calland", state: "PA", city: "Pittsburgh", careers_url: "https://www.babstcalland.com/careers" },
  { name: "Burns White", state: "PA", city: "Pittsburgh", careers_url: "https://www.burnswhite.com/careers" },
  { name: "Eckert Seamans", state: "PA", city: "Pittsburgh", careers_url: "https://www.eckertseamans.com/careers" },
  { name: "Tucker Arensberg", state: "PA", city: "Pittsburgh", careers_url: "https://www.tuckerlaw.com/careers" },
  { name: "Meyer Unkovic & Scott", state: "PA", city: "Pittsburgh", careers_url: "https://www.muslaw.com/careers" },
  { name: "Dickie McCamey & Chilcote", state: "PA", city: "Pittsburgh", careers_url: "https://www.dmclaw.com/careers" },
  { name: "Houston Harbaugh", state: "PA", city: "Pittsburgh", careers_url: "https://www.hh-law.com/careers" },
  { name: "Cohen & Grigsby", state: "PA", city: "Pittsburgh", careers_url: "https://www.cohenlaw.com/careers" },

  // ─── AM LAW 100 ─────────────────────────────────────────────────────────────
  { name: "DLA Piper", state: "NY", city: "New York", careers_url: "https://www.dlapiper.com/en-us/careers" },
  { name: "Ropes & Gray", state: "MA", city: "Boston", careers_url: "https://www.ropesgrayrecruiting.com/en/us" },
  { name: "White & Case", state: "NY", city: "New York", careers_url: "https://www.whitecase.com/careers" },
  { name: "Hogan Lovells", state: "DC", city: "Washington", careers_url: "https://www.hoganlovells.com/en/global-careers" },
  { name: "Goodwin Procter", state: "MA", city: "Boston", careers_url: "https://www.goodwinlaw.com/en/careers-pages/careers" },
  { name: "Quinn Emanuel", state: "CA", city: "Los Angeles", careers_url: "https://www.quinnemanuel.com/careers/our-culture/why-work-here/" },
  { name: "Paul Hastings", state: "NY", city: "New York", careers_url: "https://www.paulhastings.com/careers" },
  { name: "McDermott Will & Emery", state: "IL", city: "Chicago", careers_url: "https://careers.mwe.com/" },
  { name: "Cooley", state: "CA", city: "Palo Alto", careers_url: "https://www.cooley.com/careers" },
  { name: "Weil Gotshal & Manges", state: "NY", city: "New York", careers_url: "https://www.weil.com/careers" },
  { name: "Mayer Brown", state: "IL", city: "Chicago", careers_url: "https://www.mayerbrown.com/en/careers" },
  { name: "Milbank", state: "NY", city: "New York", careers_url: "https://www.milbank.com/en/careers/index.html" },
  { name: "Willkie Farr & Gallagher", state: "NY", city: "New York", careers_url: "https://www.willkie.com/careers" },
  { name: "Covington & Burling", state: "DC", city: "Washington", careers_url: "https://www.cov.com/en/careers" },
  { name: "Debevoise & Plimpton", state: "NY", city: "New York", careers_url: "https://www.debevoise.com/careers" },
  { name: "WilmerHale", state: "DC", city: "Washington", careers_url: "https://www.wilmerhale.com/en/careers" },
  { name: "Orrick Herrington & Sutcliffe", state: "CA", city: "San Francisco", careers_url: "https://www.orrick.com/Careers" },
  { name: "Akin Gump", state: "DC", city: "Washington", careers_url: "https://www.akingump.com/en/careers" },
  { name: "Wilson Sonsini", state: "CA", city: "Palo Alto", careers_url: "https://careers.wsgr.com/" },
  { name: "Morrison & Foerster", state: "CA", city: "San Francisco", careers_url: "https://careers.mofo.com/" },
  { name: "Proskauer Rose", state: "NY", city: "New York", careers_url: "https://www.proskauer.com/careers" },
  { name: "K&L Gates", state: "PA", city: "Pittsburgh", careers_url: "https://www.klgates.com/careers" },
  { name: "Foley & Lardner", state: "WI", city: "Milwaukee", careers_url: "https://www.foley.com/careers/" },
  { name: "Winston & Strawn", state: "IL", city: "Chicago", careers_url: "https://www.winston.com/en/careers" },
  { name: "Perkins Coie", state: "WA", city: "Seattle", careers_url: "https://perkinscoie.com/careers" },
  { name: "Sheppard Mullin", state: "CA", city: "Los Angeles", careers_url: "https://www.sheppard.com/careers" },
  { name: "Wachtell Lipton", state: "NY", city: "New York", careers_url: "https://www.wlrk.com/careers/" },
  { name: "Arnold & Porter", state: "DC", city: "Washington", careers_url: "https://www.arnoldporter.com/en/careers" },
  { name: "Fried Frank", state: "NY", city: "New York", careers_url: "https://www.friedfrank.com/careers" },
  { name: "O'Melveny & Myers", state: "CA", city: "Los Angeles", careers_url: "https://www.omm.com/careers/" },
  { name: "Faegre Drinker", state: "MN", city: "Minneapolis", careers_url: "https://www.faegredrinker.com/en/careers" },
  { name: "BakerHostetler", state: "OH", city: "Cleveland", careers_url: "https://www.bakerlaw.com/careers/overview/" },
  { name: "Vinson & Elkins", state: "TX", city: "Houston", careers_url: "https://www.velaw.com/careers/" },
  { name: "Nelson Mullins", state: "SC", city: "Columbia", careers_url: "https://www.nelsonmullins.com/careers" },
  { name: "Seyfarth Shaw", state: "IL", city: "Chicago", careers_url: "https://www.seyfarth.com/careers/index.html" },
  { name: "Katten Muchin Rosenman", state: "IL", city: "Chicago", careers_url: "https://katten.com/careers" },
  { name: "Bryan Cave Leighton Paisner", state: "MO", city: "St. Louis", careers_url: "https://www.bclplaw.com/en-US/careers.html" },
  { name: "Baker Botts", state: "TX", city: "Houston", careers_url: "https://www.bakerbotts.com/careers/careers-at-baker-botts" },
  { name: "Pillsbury Winthrop", state: "CA", city: "San Francisco", careers_url: "https://careers.pillsburylaw.com/" },
  { name: "Fenwick & West", state: "CA", city: "Mountain View", careers_url: "https://www.fenwick.com/careers" },
  { name: "Fox Rothschild", state: "PA", city: "Philadelphia", careers_url: "https://www.foxrothschild.com/careers-for-staff" },
  { name: "Gordon Rees Scully Mansukhani", state: "CA", city: "San Francisco", careers_url: "https://www.grsm.com/careers/" },
  { name: "Lewis Brisbois", state: "CA", city: "Los Angeles", careers_url: "https://lewisbrisbois.com/careers" },
  { name: "Barnes & Thornburg", state: "IN", city: "Indianapolis", careers_url: "https://btlaw.com/en/careers" },
  { name: "Blank Rome", state: "PA", city: "Philadelphia", careers_url: "https://www.blankrome.com/careers" },
  { name: "Littler Mendelson", state: "CA", city: "San Francisco", careers_url: "https://www.littler.com/careers" },
  { name: "Ogletree Deakins", state: "SC", city: "Greenville", careers_url: "https://ogletree.com/about-us/careers/" },
  { name: "Cozen O'Connor", state: "PA", city: "Philadelphia", careers_url: "https://www.cozen.com/careers" },
  { name: "Mintz", state: "MA", city: "Boston", careers_url: "https://www.mintz.com/careers" },
  { name: "Norton Rose Fulbright", state: "TX", city: "Houston", careers_url: "https://www.nortonrosefulbright.com/en-us/careers" },
  { name: "Dentons", state: "DC", city: "Washington", careers_url: "https://www.dentons.com/en/careers" },
  { name: "A&O Shearman", state: "NY", city: "New York", careers_url: "https://www.aoshearman.com/en/careers" },
  { name: "Clifford Chance", state: "NY", city: "New York", careers_url: "https://jobs.cliffordchance.com/us" },
  { name: "Freshfields", state: "NY", city: "New York", careers_url: "https://www.freshfields.com/en/your-career/united-states" },
  { name: "Jenner & Block", state: "IL", city: "Chicago", careers_url: "https://www.jenner.com/en/careers" },
  { name: "Squire Patton Boggs", state: "OH", city: "Cleveland", careers_url: "https://www.squirepattonboggs.com/en/careers" },
  { name: "Davis Wright Tremaine", state: "WA", city: "Seattle", careers_url: "https://www.dwt.com/careers" },
  { name: "Kilpatrick Townsend", state: "GA", city: "Atlanta", careers_url: "https://ktslaw.com/en/Careers" },
  { name: "Duane Morris", state: "PA", city: "Philadelphia", careers_url: "https://www.duanemorris.com/site/careers.html" },
  { name: "Nixon Peabody", state: "NY", city: "Rochester", careers_url: "https://www.nixonpeabody.com/careers" },
  { name: "Haynes and Boone", state: "TX", city: "Dallas", careers_url: "https://www.haynesboone.com/careers" },
  { name: "Fish & Richardson", state: "MA", city: "Boston", careers_url: "https://www.fr.com/careers/" },
  { name: "Cadwalader Wickersham & Taft", state: "NY", city: "New York", careers_url: "https://www.cadwalader.com/careers/" },
  { name: "Williams & Connolly", state: "DC", city: "Washington", careers_url: "https://www.wc.com/Careers" },
  { name: "Boies Schiller Flexner", state: "NY", city: "New York", careers_url: "https://www.bsfllp.com/careers/overview.html" },
  { name: "Munger Tolles & Olson", state: "CA", city: "Los Angeles", careers_url: "https://www.mto.com/careers/joining-munger-tolles/" },
  { name: "Schulte Roth & Zabel", state: "NY", city: "New York", careers_url: "https://www.srz.com/en/careers/business-professionals" },

  // ─── AM LAW SECOND HUNDRED ──────────────────────────────────────────────────
  { name: "Dorsey & Whitney", state: "MN", city: "Minneapolis", careers_url: "https://www.dorsey.com/careers" },
  { name: "Gunderson Dettmer", state: "CA", city: "Redwood City", careers_url: "https://www.gunder.com/en/careers" },
  { name: "Kramer Levin", state: "NY", city: "New York", careers_url: "https://www.kramerlevin.com/en/careers/index.html" },
  { name: "Cahill Gordon & Reindel", state: "NY", city: "New York", careers_url: "https://www.cahill.com/careers" },
  { name: "Manatt Phelps & Phillips", state: "CA", city: "Los Angeles", careers_url: "https://www.manatt.com/careers" },
  { name: "Vedder Price", state: "IL", city: "Chicago", careers_url: "https://www.vedderprice.com/careers" },
  { name: "Herrick Feinstein", state: "NY", city: "New York", careers_url: "https://www.herrick.com/careers/" },
  { name: "Hodgson Russ", state: "NY", city: "Buffalo", careers_url: "https://www.hodgsonruss.com/careers/our-difference" },
  { name: "Seward & Kissel", state: "NY", city: "New York", careers_url: "https://www.sewkis.com/careers/" },
  { name: "Freeman Mathis & Gary", state: "GA", city: "Atlanta", careers_url: "https://www.fmglaw.com/careers/" },
  { name: "Procopio", state: "CA", city: "San Diego", careers_url: "https://www.procopio.com/careers" },
  { name: "Kobre & Kim", state: "NY", city: "New York", careers_url: "https://kobrekim.com/careers/" },

  // ─── TEXAS — AUSTIN & SAN ANTONIO ───────────────────────────────────────────
  { name: "Jackson Walker", state: "TX", city: "Austin", careers_url: "https://www.jw.com/careers/" },
  { name: "Dykema Gossett", state: "TX", city: "Austin", careers_url: "https://www.dykema.com/careers/index.html" },
  { name: "Kelly Hart & Hallman", state: "TX", city: "Austin", careers_url: "https://www.kellyhart.com/careers/" },
  { name: "Naman Howell Smith & Lee", state: "TX", city: "Austin", careers_url: "https://www.namanhowell.com/careers/current-openings" },
  { name: "Langley & Banack", state: "TX", city: "San Antonio", careers_url: "https://www.langleybanack.com/about/careers/" },

  // ─── FLORIDA — ORLANDO, JACKSONVILLE, FORT LAUDERDALE ──────────────────────
  { name: "Lowndes", state: "FL", city: "Orlando", careers_url: "https://www.lowndes-law.com/careers/join" },
  { name: "Dean Mead", state: "FL", city: "Orlando", careers_url: "https://www.deanmead.com/about/careers/" },
  { name: "ShuffieldLowman", state: "FL", city: "Orlando", careers_url: "https://shuffieldlowman.com/careers/attorney-opportunities/" },
  { name: "Greenspoon Marder", state: "FL", city: "Orlando", careers_url: "https://www.gmlaw.com/careers/" },
  { name: "Wicker Smith", state: "FL", city: "Orlando", careers_url: "https://www.wickersmith.com/contact/careers/" },
  { name: "Fisher Phillips", state: "FL", city: "Orlando", careers_url: "https://www.fisherphillips.com/en/careers/index.html" },
  { name: "Rogers Towers", state: "FL", city: "Jacksonville", careers_url: "https://www.rtlaw.com/about-us/careers/" },
  { name: "Smith Hulsey & Busey", state: "FL", city: "Jacksonville", careers_url: "https://www.smithhulsey.com/careers/" },
  { name: "Marshall Dennehey", state: "FL", city: "Jacksonville", careers_url: "https://marshalldennehey.com/careers" },
  { name: "Becker", state: "FL", city: "Fort Lauderdale", careers_url: "https://beckerlawyers.com/careers/" },

  // ─── NORTH CAROLINA — ADDITIONAL ───────────────────────────────────────────
  { name: "Womble Bond Dickinson", state: "NC", city: "Winston-Salem", careers_url: "https://www.womblebonddickinson.com/us/careers" },
  { name: "Spilman Thomas & Battle", state: "NC", city: "Winston-Salem", careers_url: "https://www.spilmanlaw.com/careers/" },
  { name: "Hedrick Gardner", state: "NC", city: "Charlotte", careers_url: "https://hedrickgardner.com/careers/" },

  // ─── OHIO — COLUMBUS & CINCINNATI ───────────────────────────────────────────
  { name: "Vorys Sater Seymour and Pease", state: "OH", city: "Columbus", careers_url: "https://www.vorys.com/careers-attorneys" },
  { name: "Porter Wright", state: "OH", city: "Columbus", careers_url: "https://www.porterwright.com/careers/attorneys/" },
  { name: "Bricker Graydon", state: "OH", city: "Columbus", careers_url: "https://www.brickergraydon.com/careers" },
  { name: "Thompson Hine", state: "OH", city: "Columbus", careers_url: "https://www.thompsonhine.com/careers/overview/" },
  { name: "Calfee Halter & Griswold", state: "OH", city: "Columbus", careers_url: "https://www.calfee.com/careers-current-opportunities" },
  { name: "Benesch", state: "OH", city: "Cleveland", careers_url: "https://www.beneschlaw.com/careers/index.html" },
  { name: "Hahn Loeser & Parks", state: "OH", city: "Columbus", careers_url: "https://www.hahnlaw.com/careers/" },
  { name: "Roetzel & Andress", state: "OH", city: "Columbus", careers_url: "https://www.ralaw.com/careers" },
  { name: "Reminger", state: "OH", city: "Columbus", careers_url: "https://www.reminger.com/careers" },
  { name: "Keating Muething & Klekamp", state: "OH", city: "Cincinnati", careers_url: "https://www.kmklaw.com/careers" },
  { name: "Taft Stettinius & Hollister", state: "OH", city: "Cincinnati", careers_url: "https://www.taftlaw.com/careers/" },
  { name: "Strauss Troy", state: "OH", city: "Cincinnati", careers_url: "https://www.strausstroy.com/careers" },
  { name: "Dinsmore & Shohl", state: "OH", city: "Cincinnati", careers_url: "https://www.dinsmore.com/careers/" },

  // ─── MICHIGAN ───────────────────────────────────────────────────────────────
  { name: "Honigman", state: "MI", city: "Detroit", careers_url: "https://www.honigman.com/careers-students" },
  { name: "Miller Canfield", state: "MI", city: "Detroit", careers_url: "https://www.millercanfield.com/careers-summer.html" },
  { name: "Bodman", state: "MI", city: "Detroit", careers_url: "https://careers.bodmanlaw.com/students" },
  { name: "Clark Hill", state: "MI", city: "Detroit", careers_url: "https://www.clarkhill.com/careers/students/" },
  { name: "Butzel Long", state: "MI", city: "Detroit", careers_url: "https://www.butzel.com/careers-summer-associate-program" },
  { name: "Dykema", state: "MI", city: "Detroit", careers_url: "https://www.dykema.com/careers/index.html" },
  { name: "Plunkett Cooney", state: "MI", city: "Bloomfield Hills", careers_url: "https://www.plunkettcooney.com/careers.html" },
  { name: "Warner Norcross + Judd", state: "MI", city: "Grand Rapids", careers_url: "https://www.wnj.com/Careers" },
  { name: "Miller Johnson", state: "MI", city: "Grand Rapids", careers_url: "https://millerjohnson.com/summer-associate-program/" },
  { name: "Varnum", state: "MI", city: "Grand Rapids", careers_url: "https://www.varnumlaw.com/careers/law-students/" },
  { name: "Foster Swift", state: "MI", city: "Lansing", careers_url: "https://www.fosterswift.com/careers-information-associates.html" },
  { name: "Kerr Russell", state: "MI", city: "Detroit", careers_url: "https://www.kerr-russell.com/careers-at-kerr-russell/" },

  // ─── INDIANA ────────────────────────────────────────────────────────────────
  { name: "Ice Miller", state: "IN", city: "Indianapolis", careers_url: "https://www.icemiller.com/careers/overview/" },
  { name: "Bose McKinney & Evans", state: "IN", city: "Indianapolis", careers_url: "https://www.boselaw.com/careers/" },
  { name: "Krieg DeVault", state: "IN", city: "Indianapolis", careers_url: "https://www.kriegdevault.com/careers" },
  { name: "Hall Render", state: "IN", city: "Indianapolis", careers_url: "https://hallrender.com/careers/" },
  { name: "Scopelitis Garvin Light Hanson & Feary", state: "IN", city: "Indianapolis", careers_url: "https://scopelitis.com/careers/" },

  // ─── MISSOURI — ST. LOUIS ──────────────────────────────────────────────────
  { name: "Thompson Coburn", state: "MO", city: "St. Louis", careers_url: "https://www.thompsoncoburn.com/career/careers/" },
  { name: "Lewis Rice", state: "MO", city: "St. Louis", careers_url: "https://www.lewisrice.com/careers/law-students-st-louis/summer-experience/" },
  { name: "UB Greensfelder", state: "MO", city: "St. Louis", careers_url: "https://www.ubglaw.com/careers.html" },
  { name: "Sandberg Phoenix", state: "MO", city: "St. Louis", careers_url: "https://www.sandberglife.com/career-paths/attorneys" },
  { name: "Carmody MacDonald", state: "MO", city: "Clayton", careers_url: "https://carmodymacdonald.com/careers/" },
  { name: "Dowd Bennett", state: "MO", city: "St. Louis", careers_url: "https://www.dowdbennett.com/careers/" },

  // ─── ARKANSAS ───────────────────────────────────────────────────────────────
  { name: "Friday Eldredge & Clark", state: "AR", city: "Little Rock", careers_url: "https://fridayfirm.com/about/our-career-opportunities" },
  { name: "Wright Lindsey Jennings", state: "AR", city: "Little Rock", careers_url: "https://wlj.com/about/careers/" },
  { name: "Mitchell Williams", state: "AR", city: "Little Rock", careers_url: "https://www.mitchellwilliamslaw.com/careers" },
  { name: "Rose Law Firm", state: "AR", city: "Little Rock", careers_url: "https://www.roselawfirm.com/careers/" },
  { name: "Quattlebaum Grooms & Tull", state: "AR", city: "Little Rock", careers_url: "https://www.qgtlaw.com/careers/" },
  { name: "Kutak Rock", state: "AR", city: "Little Rock", careers_url: "https://www.kutakrock.com/general-content/careers" },
  { name: "Hall Estill", state: "AR", city: "NW Arkansas", careers_url: "https://www.hallestill.com/join-us/overview" },

  // ─── MISSISSIPPI ────────────────────────────────────────────────────────────
  { name: "Brunini Grantham Grower & Hewes", state: "MS", city: "Jackson", careers_url: "https://www.brunini.com/careers/" },
  { name: "Watkins & Eager", state: "MS", city: "Jackson", careers_url: "https://www.watkinseager.com/careers" },
  { name: "Wise Carter Child & Caraway", state: "MS", city: "Jackson", careers_url: "https://www.wisecarter.com/our-firm/careers/" },
  { name: "Daniel Coker", state: "MS", city: "Jackson", careers_url: "https://www.danielcoker.com/contact/careers/" },
  { name: "Forman Watkins & Krutz", state: "MS", city: "Jackson", careers_url: "https://www.formanwatkins.com/careers/professional-staff/" },

  // ─── OKLAHOMA ───────────────────────────────────────────────────────────────
  { name: "McAfee & Taft", state: "OK", city: "Oklahoma City", careers_url: "https://www.mcafeetaft.com/careers/" },
  { name: "Crowe & Dunlevy", state: "OK", city: "Oklahoma City", careers_url: "https://www.crowedunlevy.com/about-us/careers/" },
  { name: "Hall Estill", state: "OK", city: "Tulsa", careers_url: "https://www.hallestill.com/join-us/overview" },
  { name: "GableGotwals", state: "OK", city: "Tulsa", careers_url: "https://www.gablelaw.com/careers/" },
  { name: "Conner & Winters", state: "OK", city: "Tulsa", careers_url: "https://www.cwlaw.com/careers" },
  { name: "Fellers Snider", state: "OK", city: "Oklahoma City", careers_url: "https://www.fellerssnider.com/careers/" },
  { name: "Phillips Murrah", state: "OK", city: "Oklahoma City", careers_url: "https://phillipsmurrah.com/careers/" },
  { name: "Riggs Abney", state: "OK", city: "Tulsa", careers_url: "https://riggsabney.com/careers/" },

  // ─── NEBRASKA ───────────────────────────────────────────────────────────────
  { name: "Kutak Rock", state: "NE", city: "Omaha", careers_url: "https://www.kutakrock.com/general-content/careers" },
  { name: "Baird Holm", state: "NE", city: "Omaha", careers_url: "https://www.bairdholm.com/opportunities/" },
  { name: "Koley Jessen", state: "NE", city: "Omaha", careers_url: "https://www.koleyjessen.com/careers/attorneys" },
  { name: "Fraser Stryker", state: "NE", city: "Omaha", careers_url: "https://www.fraserstryker.com/careers/" },
  { name: "McGrath North", state: "NE", city: "Omaha", careers_url: "https://www.mcgrathnorth.com/careers/" },
  { name: "Cline Williams", state: "NE", city: "Omaha", careers_url: "https://www.clinewilliams.com/careers/careers.html" },
  { name: "Woods Aitken", state: "NE", city: "Lincoln", careers_url: "https://www.woodsaitken.com/about/careers" },
  { name: "Baylor Evnen", state: "NE", city: "Lincoln", careers_url: "https://baylorevnen.com/careers/" },

  // ─── IOWA ───────────────────────────────────────────────────────────────────
  { name: "Nyemaster Goode", state: "IA", city: "Des Moines", careers_url: "https://nyemaster.com/careers/" },
  { name: "BrownWinick", state: "IA", city: "Des Moines", careers_url: "https://www.brownwinick.com/careers" },
  { name: "Ahlers & Cooney", state: "IA", city: "Des Moines", careers_url: "https://www.ahlerslaw.com/careers" },
  { name: "Simmons Perrine Moyer Bergman", state: "IA", city: "Cedar Rapids", careers_url: "https://www.spmblaw.com/careers" },
  { name: "Shuttleworth & Ingersoll", state: "IA", city: "Cedar Rapids", careers_url: "https://www.shuttleworthlaw.com/careers/" },

  // ─── WISCONSIN ──────────────────────────────────────────────────────────────
  { name: "Godfrey & Kahn", state: "WI", city: "Milwaukee", careers_url: "https://www.gklaw.com/Careers.htm" },
  { name: "Reinhart Boerner Van Deuren", state: "WI", city: "Milwaukee", careers_url: "https://www.reinhartlaw.com/careers/" },
  { name: "von Briesen & Roper", state: "WI", city: "Milwaukee", careers_url: "https://www.vonbriesen.com/careers" },
  { name: "Michael Best & Friedrich", state: "WI", city: "Milwaukee", careers_url: "https://www.michaelbest.com/Careers" },
  { name: "DeWitt", state: "WI", city: "Madison", careers_url: "https://dewittllp.com/careers" },
  { name: "Stafford Rosenbaum", state: "WI", city: "Madison", careers_url: "https://www.staffordlaw.com/careers/" },
  { name: "Axley Brynelson", state: "WI", city: "Madison", careers_url: "https://www.axley.com/contact/careers/" },

  // ─── CONNECTICUT ────────────────────────────────────────────────────────────
  { name: "Robinson+Cole", state: "CT", city: "Hartford", careers_url: "https://www.rc.com/careers/lawyers/lateral-hires.cfm" },
  { name: "Shipman & Goodwin", state: "CT", city: "Hartford", careers_url: "https://www.shipmangoodwin.com/" },
  { name: "Pullman & Comley", state: "CT", city: "Hartford", careers_url: "https://www.pullcom.com/careers-attorney-careers" },
  { name: "Day Pitney", state: "CT", city: "Hartford", careers_url: "https://www.daypitney.com/" },
  { name: "Wiggin and Dana", state: "CT", city: "New Haven", careers_url: "https://www.wiggin.com/careers-at-wiggin/current-openings/" },
  { name: "Carmody Torrance Sandak & Hennessey", state: "CT", city: "New Haven", careers_url: "https://www.carmodylaw.com/careers/our-employment-policy/" },
  { name: "Cummings & Lockwood", state: "CT", city: "Stamford", careers_url: "https://www.cl-law.com/careers/open-positions-connecticut-and-florida-offices" },
  { name: "Jackson Lewis", state: "CT", city: "Hartford", careers_url: "https://www.jacksonlewis.com/careers" },

  // ─── NEW JERSEY ─────────────────────────────────────────────────────────────
  { name: "Lowenstein Sandler", state: "NJ", city: "Roseland", careers_url: "https://www.lowenstein.com/careers" },
  { name: "McCarter & English", state: "NJ", city: "Newark", careers_url: "https://www.mccarter.com/jobs/" },
  { name: "Sills Cummis & Gross", state: "NJ", city: "Newark", careers_url: "https://www.sillscummis.com/careers/" },
  { name: "Gibbons", state: "NJ", city: "Newark", careers_url: "https://careers.gibbonslaw.com/" },
  { name: "Connell Foley", state: "NJ", city: "Roseland", careers_url: "https://www.connellfoley.com/careers" },
  { name: "Chiesa Shahinian & Giantomasi", state: "NJ", city: "Roseland", careers_url: "https://www.csglaw.com/careers/" },
  { name: "Archer & Greiner", state: "NJ", city: "Princeton", careers_url: "https://www.archerlaw.com/en/careers" },
  { name: "Brach Eichler", state: "NJ", city: "Roseland", careers_url: "https://www.bracheichler.com/careers/" },

  // ─── MASSACHUSETTS — BOSTON ─────────────────────────────────────────────────
  { name: "Nutter McClennen & Fish", state: "MA", city: "Boston", careers_url: "https://www.nutter.com/careers" },
  { name: "Foley Hoag", state: "MA", city: "Boston", careers_url: "https://foleyhoag.com/careers/" },
  { name: "Choate Hall & Stewart", state: "MA", city: "Boston", careers_url: "https://www.choate.com/careers/" },
  { name: "Brown Rudnick", state: "MA", city: "Boston", careers_url: "https://brownrudnick.com/careers/" },
  { name: "Goulston & Storrs", state: "MA", city: "Boston", careers_url: "https://www.goulstonstorrs.com/" },
  { name: "Burns & Levinson", state: "MA", city: "Boston", careers_url: "https://www.burnslev.com/about-us/careers/" },
  { name: "Hinckley Allen", state: "MA", city: "Boston", careers_url: "https://www.hinckleyallen.com/careers/" },
  { name: "Pierce Atwood", state: "MA", city: "Boston", careers_url: "https://www.pierceatwood.com/careers" },

  // ─── WASHINGTON DC ──────────────────────────────────────────────────────────
  { name: "Wiley Rein", state: "DC", city: "Washington", careers_url: "https://www.wiley.law/careers" },
  { name: "Crowell & Moring", state: "DC", city: "Washington", careers_url: "https://www.crowell.com/en/careers" },
  { name: "Steptoe", state: "DC", city: "Washington", careers_url: "https://www.steptoe.com/en/careers/index.html" },
  { name: "Finnegan Henderson", state: "DC", city: "Washington", careers_url: "https://www.finnegan.com/en/careers/index.html" },
  { name: "ArentFox Schiff", state: "DC", city: "Washington", careers_url: "https://www.afslaw.com/careers" },
  { name: "Kelley Drye & Warren", state: "DC", city: "Washington", careers_url: "https://www.kelleydrye.com/careers" },
  { name: "Beveridge & Diamond", state: "DC", city: "Washington", careers_url: "https://www.bdlaw.com/careers/" },
  { name: "Sterne Kessler", state: "DC", city: "Washington", careers_url: "https://www.sternekessler.com/careers/" },
  { name: "Epstein Becker & Green", state: "DC", city: "Washington", careers_url: "https://www.ebglaw.com/careers/overview" },
  { name: "Hausfeld", state: "DC", city: "Washington", careers_url: "https://www.hausfeld.com/en-us/hidden-subpages/1l-diversity-fellowship-program" },

  // ─── DELAWARE ───────────────────────────────────────────────────────────────
  { name: "Morris Nichols Arsht & Tunnell", state: "DE", city: "Wilmington", careers_url: "https://www.morrisnichols.com/careers-working-at-morris-nichols" },
  { name: "Richards Layton & Finger", state: "DE", city: "Wilmington", careers_url: "https://www.rlf.com/careers/" },
  { name: "Young Conaway Stargatt & Taylor", state: "DE", city: "Wilmington", careers_url: "https://www.youngconaway.com/careers/" },
  { name: "Potter Anderson & Corroon", state: "DE", city: "Wilmington", careers_url: "https://www.potteranderson.com/careers.html" },
  { name: "Ross Aronstam & Moritz", state: "DE", city: "Wilmington", careers_url: "https://www.ramllp.com/careers/hiring" },

  // ─── 1L DIVERSITY FELLOWSHIP FIRMS ──────────────────────────────────────────
  { name: "Allen Matkins", state: "CA", city: "Los Angeles", careers_url: "https://www.allenmatkins.com/careers/summer-associate-program/allen-matkins-1l-diversity-summer-program.html" },
  { name: "Best Best & Krieger", state: "CA", city: "Riverside", careers_url: "https://bbklaw.com/law-students" },
  { name: "Cox Castle & Nicholson", state: "CA", city: "Los Angeles", careers_url: "https://www.coxcastle.com/careers-1l-diversity-scholars-program" },
  { name: "Knobbe Martens", state: "CA", city: "Irvine", careers_url: "https://www.knobbe.com/careers/law-student-recruiting/" },
  { name: "Klehr Harrison Harvey Branzburg", state: "PA", city: "Philadelphia", careers_url: "https://klehr.com/about/diversity/fellowship/" },
  { name: "Irell & Manella", state: "CA", city: "Los Angeles", careers_url: "https://www.irell.com/careers" },
];

const SYSTEM_PROMPT = `You are a data extraction assistant. Return ONLY a raw JSON object. Do NOT use markdown code fences. Do NOT wrap the response in backticks. Start your response with { and end with }. No text before or after the JSON.`;

function getUserPrompt(pageText) {
  return `Extract the following from this law firm careers page and return as JSON with exactly these keys: has_1l_program (boolean, true if any 1L summer associate or 1L summer program exists), has_fellowship (boolean, true if any named 1L diversity fellowship exists), fellowship_name (string or null), office_locations (array of city strings where they are hiring), app_window (string or null), app_window_start (string or null in ISO date format), app_window_end (string or null in ISO date format), apply_url (string or null), practice_areas (array of strings), firm_size (string or null), notes (string or null). Page text: ${pageText}`;
}

function loadExisting(path) {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

async function scrapeFirm(browser, firm) {
  const page = await browser.newPage();
  try {
    await page.goto(firm.careers_url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const pageText = await page.evaluate(() => document.body.innerText);

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: getUserPrompt(pageText) }],
    });

    const rawText = response.content[0].text;
    const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      success: true,
      data: {
        name: firm.name,
        state: firm.state,
        city: firm.city,
        careers_url: firm.careers_url,
        scraped_at: new Date().toISOString(),
        ...parsed,
      },
    };
  } catch (error) {
    const reason =
      error.name === 'TimeoutError' ? 'timeout' :
      error instanceof SyntaxError ? 'invalid_json' :
      error.message?.includes('net::') ? 'navigation_failed' :
      error.message || 'unknown';

    const result = { success: false, reason, firm: firm.name };

    if (error instanceof SyntaxError) {
      result.rawText = error.message;
      try {
        const rawText = (await client.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: getUserPrompt('') }],
        })).content[0].text;
        result.rawText = rawText;
      } catch {
        // keep original error message as rawText
      }
    }

    return result;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(`\nScraping ${FIRMS_TO_SCRAPE.length} firms...\n`);

  const browser = await chromium.launch({ headless: true });
  const results = loadExisting(FIRMS_PATH);
  const errors = loadExisting(ERRORS_PATH);
  let succeeded = 0;
  let failed = 0;

  for (const firm of FIRMS_TO_SCRAPE) {
    try {
      const result = await scrapeFirm(browser, firm);

      if (result.success) {
        results.push(result.data);
        succeeded++;
        console.log(`  \u2713 ${firm.name}`);
      } else {
        failed++;
        console.log(`  \u2717 ${firm.name} — ${result.reason}`);
        if (result.rawText) {
          errors.push({ firm: firm.name, rawText: result.rawText, timestamp: new Date().toISOString() });
        }
      }
    } catch (error) {
      failed++;
      console.log(`  \u2717 ${firm.name} — ${error.message}`);
    }

    saveJson(FIRMS_PATH, results);
    saveJson(ERRORS_PATH, errors);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await browser.close();

  console.log(`\n--- Summary ---`);
  console.log(`${succeeded} succeeded, ${failed} failed\n`);
}

main();
