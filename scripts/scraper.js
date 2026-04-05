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
